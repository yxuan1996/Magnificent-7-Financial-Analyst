import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This route handles the OAuth / magic-link callback from Supabase.
// Supabase redirects here after the user clicks the confirmation link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to chat after successful login
  return NextResponse.redirect(`${origin}/chat`);
}