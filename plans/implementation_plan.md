# Security Hardening Plan: RLS + Middleware + HttpOnly Cookies

## Background

The app currently uses Supabase (`@supabase/supabase-js`) with:
- JWT auth already issued by Supabase (✅ working)
- Client-side role checks (`user.role === 'SPT'`) for UI gating — easily bypassed via DevTools
- JWT stored in `localStorage` — readable via DevTools XSS
- Route protection done inside React components with `useEffect` redirects — the page HTML/JS still loads
- **No Row Level Security (RLS)** on Supabase tables — anyone with a valid JWT can read/write anything
- **No `middleware.ts`** — no server-side route blocking

---

## User Review Required

> [!IMPORTANT]
> **Phase 2 (HttpOnly Cookies via `@supabase/ssr`) is an optional upgrade.** It requires migrating the auth client from `@supabase/supabase-js` to `@supabase/ssr`, which changes how sessions are stored and how the Supabase client is created in each route. It is more complex to implement but significantly hardens XSS resilience. Please review and approve whether to include Phase 2 before execution.

> [!WARNING]
> **RLS policies must be written carefully.** An overly restrictive policy can break existing app features. The plan below documents every policy before applying it, but you should be present to test after each table is configured.

> [!CAUTION]
> **RLS must also be enabled on the Supabase dashboard manually.** SQL-only `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is enough, but it must be applied in the correct order (users table first, then others). We will run these as SQL migrations via the Supabase SQL Editor.

---

## Open Questions

> [!IMPORTANT]
> 1. **Should `@supabase/ssr` (HttpOnly cookies) be included?** This is Phase 2 of this plan. If you want maximum security, include it. If you want a simpler, quicker implementation, we can skip to Phase 1 + Phase 3 only.
> 2. **Real-time subscriptions use the anon key from the browser.** With RLS enabled, real-time Postgres CDC events are filtered by user identity. Are you okay with re-testing all real-time listeners after RLS is enabled?
> 3. **The `/admin` page currently shows an "Access Denied" UI for non-SPT users.** With middleware, they will be hard-redirected to `/dashboard` *before the page loads*. This is better security. Are you okay with that UX change?

---

## Proposed Changes

### Phase 1 — Row Level Security (RLS) on Supabase

This is the most critical fix. Applied entirely in the **Supabase SQL Editor** — no code changes needed.

#### Tables & Policies

**`users` table:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read user profiles (needed for the dashboard, task pages, etc.)
CREATE POLICY "users: authenticated read" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only update their own profile
CREATE POLICY "users: self update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Only SPTs can update any user (for role management in admin panel)
-- We detect SPT role by checking the users table itself
CREATE POLICY "users: spt full update" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );

-- Insert is allowed on signup (the auth trigger / use-auth.tsx creates the profile)
CREATE POLICY "users: self insert" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

**`tasks` table:**
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tasks
CREATE POLICY "tasks: authenticated read" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only SPTs and JPTs can create tasks
CREATE POLICY "tasks: spt_jpt create" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only the creator, an SPT, or a JPT can update tasks
CREATE POLICY "tasks: creator or spt_jpt update" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only SPTs can delete tasks
CREATE POLICY "tasks: spt delete" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );
```

**`announcements` table:**
```sql
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- All active users can read announcements (audience filtering is still done in app logic)
CREATE POLICY "announcements: authenticated read" ON announcements
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only SPTs and JPTs can create announcements
CREATE POLICY "announcements: spt_jpt create" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only the author, an SPT, or a JPT can update announcements
CREATE POLICY "announcements: author or spt_jpt update" ON announcements
  FOR UPDATE USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only SPTs can delete announcements
CREATE POLICY "announcements: spt delete" ON announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );
```

**`resources` table:**
```sql
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read resources
CREATE POLICY "resources: authenticated read" ON resources
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only SPTs and JPTs can create resources
CREATE POLICY "resources: spt_jpt create" ON resources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only the creator, SPTs, or JPTs can update resources
CREATE POLICY "resources: creator or spt_jpt update" ON resources
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SPT', 'JPT'))
  );

-- Only SPTs can delete resources
CREATE POLICY "resources: spt delete" ON resources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );
```

**`blacklist` and `whitelist` tables:**
```sql
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;

-- Only SPTs can read/write blacklist and whitelist
CREATE POLICY "blacklist: spt only" ON blacklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );

CREATE POLICY "whitelist: spt only" ON whitelist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SPT')
  );
```

> [!NOTE]
> **Exception for `isEmailBlacklisted` and `isEmailWhitelisted`:** These functions in `use-auth.tsx` run during signup *before* the user has a profile. This means they need read access to `blacklist`/`whitelist` without an SPT role. We'll handle this by making these checks via a Supabase **Edge Function** that uses the service role key (server-side only), instead of calling them directly from the browser client.

---

### Phase 2 — Next.js `middleware.ts` (Server-Side Route Protection)

**No Supabase changes needed. Code-only changes.**

#### [NEW] [middleware.ts](file:///c:/Users/bhoov/OneDrive/Documents/PUrge/middleware.ts)

A new file at the **project root** (not in `src/`). Next.js automatically picks it up.

```
Protected route matrix:
  /dashboard, /task/*, /profile/*  → must be logged in + status === 'active'
  /admin                           → must be logged in + role === 'SPT'
  /login, /signup                  → redirect to /dashboard if already logged in
  /pending-approval                → must be logged in + status === 'pending'
  /access-declined                 → must be logged in + status === 'declined'
```

The middleware will:
1. Read the Supabase session from the cookie
2. Check the user's status and role by calling a lightweight Supabase query
3. Redirect unauthenticated users before any page HTML is sent to the browser

#### [MODIFY] [supabase.ts](file:///c:/Users/bhoov/OneDrive/Documents/PUrge/src/lib/supabase.ts)

Currently uses `createClient` from `@supabase/supabase-js`. For middleware we need a separate **server client** that reads cookies. We'll add `src/lib/supabase-server.ts` as a companion file using `createServerClient` from `@supabase/ssr`.

#### [NEW] `src/lib/supabase-server.ts`

A server-only Supabase client that reads the session cookie. Used exclusively by middleware and Server Components.

---

### Phase 3 — (Optional) HttpOnly Cookies via `@supabase/ssr`

> [!IMPORTANT]
> This phase requires installing `@supabase/ssr` and replacing the session storage mechanism. **Skip this phase if you want a simpler rollout — Phase 1 + Phase 2 alone provides strong security.**

**What changes:**
- Install: `npm install @supabase/ssr`
- Replace `createClient` in `src/lib/supabase.ts` with `createBrowserClient` from `@supabase/ssr`
- Update `src/lib/supabase-server.ts` to use `createServerClient` with proper cookie handlers
- Add a Next.js API route (`/api/auth/callback`) to handle the OAuth callback and set the HttpOnly cookie
- Update `src/hooks/use-auth.tsx` to use the new browser client

**Why this matters:** JWTs will be stored in `HttpOnly` cookies instead of `localStorage`. This means JavaScript (including malicious scripts injected via XSS) cannot read the token at all.

---

## Verification Plan

### Automated Tests
```bash
npm run typecheck   # Must pass with zero errors after all code changes
npm run build       # Must build cleanly
```

### Manual Verification

**Phase 1 (RLS):**
- Log in as an Associate, open DevTools → Network tab, and manually make a `fetch` to `https://<project>.supabase.co/rest/v1/blacklist` with your session token → should get a `401` or empty result
- Log in as a JPT and try to delete a task via the API directly → should be blocked
- Log in as an SPT and verify all admin functions (approve user, update role, blacklist) still work

**Phase 2 (Middleware):**
- While logged out, try to navigate directly to `/dashboard` → should be instantly redirected to `/login` with no flash of the dashboard
- While logged in as a JPT, try navigating to `/admin` directly → should be instantly redirected to `/dashboard`
- Log in as a pending user → should be redirected to `/pending-approval`

**Phase 3 (Cookies — if implemented):**
- Open DevTools → Application → Local Storage → should show no Supabase tokens
- Open DevTools → Application → Cookies → should see an `sb-...` HttpOnly cookie (cannot be read by JS)
