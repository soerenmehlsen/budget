"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_FEEDBACK_LENGTH = 2000;
const NOTIFY_EMAIL = process.env.FEEDBACK_NOTIFY_EMAIL ?? "soeren48@hotmail.com";

export async function submitFeedback(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return { success: false } as const;
  if (trimmed.length > MAX_FEEDBACK_LENGTH) return { success: false } as const;

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) return { success: false } as const;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await admin.from("feedback").insert({
    user_id: user.id,
    message: trimmed,
    source: "account_page",
  });

  if (error) {
    return { success: false } as const;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Budget App <onboarding@resend.dev>",
    to: NOTIFY_EMAIL,
    subject: "Ny feedback modtaget",
    text: `Ny feedback fra ${user.email ?? user.id}:\n\n${trimmed}`,
  });

  return { success: true } as const;
}
