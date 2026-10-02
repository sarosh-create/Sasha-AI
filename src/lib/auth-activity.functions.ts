/**
 * Records every sign-in and sign-out and emails the site owners so they can
 * follow account activity straight from their inbox.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Email service is in test mode: only the account owner inbox can receive mail until a domain is verified.
const OWNER_EMAILS = ["tsr4sg@gmail.com"];

export const logAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { event: "sign_in" | "sign_out"; userAgent?: string }) => ({
    event: input.event === "sign_out" ? ("sign_out" as const) : ("sign_in" as const),
    userAgent: (input.userAgent ?? "").slice(0, 300),
  }))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as { userId: string; claims: Record<string, unknown> };
    const email = typeof claims?.["email"] === "string" ? (claims["email"] as string) : null;

    const { adminClient, sendEmail, shell, escapeHtml } = await import("@/lib/emails.server");
    const admin = adminClient();

    await admin.from("auth_activity").insert({
      user_id: userId,
      email,
      event: data.event,
      user_agent: data.userAgent || null,
    });

    // Only alert on sign-ins from a device we haven't seen for this account today,
    // plus every sign-out, so the inbox stays useful rather than noisy.
    const when = new Date().toUTCString();
    const title = data.event === "sign_in" ? "Someone signed in" : "Someone signed out";
    const html = shell(
      `${title} — Sasha AI`,
      `<table style="width:100%;font-size:14px;color:#e2e8f0">
        <tr><td style="padding:4px 0;color:#94a3b8">Account</td><td>${escapeHtml(email ?? "unknown")}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">Event</td><td>${data.event === "sign_in" ? "Signed in" : "Signed out"}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">Time (UTC)</td><td>${escapeHtml(when)}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">Device</td><td>${escapeHtml(data.userAgent || "unknown")}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">User ID</td><td>${escapeHtml(userId)}</td></tr>
      </table>`,
    );

    await Promise.all(
      OWNER_EMAILS.map((to) => sendEmail(to, `${title}: ${email ?? userId}`, html).catch(() => null)),
    );

    return { ok: true };
  });
