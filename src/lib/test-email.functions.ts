/**
 * "Send test email" — lets a signed-in student verify email delivery before launch.
 * The address always comes from the verified token, never from client input.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendEmail, shell } = await import("@/lib/emails.server");
    const to = (context as { claims?: { email?: string } }).claims?.email;
    if (!to) return { ok: false as const, error: "No email address on your account." };

    await sendEmail(
      to,
      "Sasha AI — test email",
      shell(
        "Delivery works ✅",
        `<p style="margin:0;font-size:15px;line-height:1.6">This is a test email from Sasha AI.
         If you can read this, your daily nudges and weekly progress summaries will arrive fine.</p>`,
      ),
    );
    return { ok: true as const, to };
  });
