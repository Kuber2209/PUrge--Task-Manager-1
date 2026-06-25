import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/auth/check-email
 *
 * Server-side blacklist/whitelist check using the Supabase **service role** key.
 * This keeps the service role key out of the browser and allows the check to work
 * even after RLS is enabled (which blocks direct browser queries on those tables).
 *
 * Body: { email: string }
 * Returns: { isBlacklisted: boolean, isWhitelisted: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "check-email: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      );
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    // Service role client — bypasses RLS. NEVER expose serviceRoleKey to the browser.
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const [blacklistRes, whitelistRes] = await Promise.all([
      adminSupabase
        .from("blacklist")
        .select("email")
        .eq("email", email)
        .maybeSingle(),
      adminSupabase
        .from("whitelist")
        .select("email")
        .eq("email", email)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      isBlacklisted: !!blacklistRes.data,
      isWhitelisted: !!whitelistRes.data,
    });
  } catch (err) {
    console.error("check-email route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
