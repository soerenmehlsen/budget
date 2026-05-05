"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFY_EMAIL = "soeren48@hotmail.com";

export async function submitFeedback(userId: string, message: string) {
  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    message: message.trim(),
    source: "account_page",
  });

  if (error) {
    return { success: false } as const;
  }

  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const userEmail = userData.user?.email ?? userId;

  await resend.emails.send({
    from: "Budget App <onboarding@resend.dev>",
    to: NOTIFY_EMAIL,
    subject: "Ny feedback modtaget",
    text: `Ny feedback fra ${userEmail}:\n\n${message.trim()}`,
  });

  return { success: true } as const;
}
