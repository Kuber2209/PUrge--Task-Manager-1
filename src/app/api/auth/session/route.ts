import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
