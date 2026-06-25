import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  // Normalize 0.0.0.0 to localhost to prevent connection errors
  if (requestUrl.hostname === "0.0.0.0") {
    requestUrl.hostname = "localhost";
  }
  const origin = requestUrl.origin;

  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("OAuth exchange code error:", error);
  }

  // Return the user to an error page or login page
  return NextResponse.redirect(`${origin}/login?error=OAuth failed`);
}
