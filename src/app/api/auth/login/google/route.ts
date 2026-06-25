import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    // Normalize 0.0.0.0 to localhost to prevent connection errors
    if (requestUrl.hostname === "0.0.0.0") {
      requestUrl.hostname = "localhost";
    }
    const origin = requestUrl.origin;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error) {
      console.error("Google OAuth initiation error:", error);
      return NextResponse.redirect(`${origin}/login?error=OAuth initiation failed`);
    }

    if (data?.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.redirect(`${origin}/login?error=OAuth URL not found`);
  } catch (error) {
    console.error("GET /api/auth/login/google error:", error);
    return NextResponse.redirect(
      `http://localhost:9002/login?error=Internal server error`
    );
  }
}
