import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Root page — simply redirects based on auth state.
 * Logged in  → /chat
 * Logged out → /login
 */
export default async function RootPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  } else {
    redirect("/login");
  }
}