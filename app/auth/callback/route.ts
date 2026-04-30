import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isYcdsbEmail } from "@/lib/auth/domain";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth&code=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=oauth&code=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth&code=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isYcdsbEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/sign-in?error=domain`);
  }

  return NextResponse.redirect(`${origin}/me`);
}
