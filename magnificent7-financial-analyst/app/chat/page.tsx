import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import ChatInterface from "@/components/chat/ChatInterface";

export default async function ChatPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → go to login
  if (!user) {
    redirect("/login");
  }

  return <ChatInterface userEmail={user.email ?? ""} />;
}