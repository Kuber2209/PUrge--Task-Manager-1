import { NextResponse } from "next/server";

/**
 * This route is retired. Firebase has been replaced with Supabase + Cloudflare R2.
 * Kept as a stub to prevent 404 errors from any old bookmarked URLs.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Firebase config endpoint is no longer available." },
    { status: 410 },
  );
}
