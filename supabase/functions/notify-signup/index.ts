// Sends an admin notification email via Resend when a new user signs up.
import { getAuthedUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = ["tsr4sg@gmail.com"];
const GATEWAY = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Only a real, signed-in user can trigger their own signup notification.
    const user = await getAuthedUser(req);
    if (!user) return unauthorized(corsHeaders);

    const payload = await req.json().catch(() => ({}));
    const rawName = typeof payload?.name === "string" ? payload.name.slice(0, 100) : "";
    const rawSource = typeof payload?.source === "string" ? payload.source.slice(0, 40) : "signup";
    // Email always comes from the verified JWT, never from the request body.
    const email = user.email ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "invalid account email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const name = rawName;
    const source = rawSource;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "email not configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const subject = `🎉 New Sasha AI signup: ${name || email}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:16px">
        <h2 style="margin:0 0 12px;color:#fbbf24">New student joined Sasha AI</h2>
        <p style="margin:0 0 20px;color:#cbd5e1">A new account was just created. Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden">
          <tr><td style="padding:10px 14px;color:#94a3b8;width:120px">Name</td><td style="padding:10px 14px;color:#f1f5f9">${escapeHtml(name || "—")}</td></tr>
          <tr><td style="padding:10px 14px;color:#94a3b8;border-top:1px solid #334155">Email</td><td style="padding:10px 14px;color:#f1f5f9;border-top:1px solid #334155">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:10px 14px;color:#94a3b8;border-top:1px solid #334155">Source</td><td style="padding:10px 14px;color:#f1f5f9;border-top:1px solid #334155">${escapeHtml(source || "signup")}</td></tr>
          <tr><td style="padding:10px 14px;color:#94a3b8;border-top:1px solid #334155">Time</td><td style="padding:10px 14px;color:#f1f5f9;border-top:1px solid #334155">${new Date().toUTCString()}</td></tr>
        </table>
        <p style="margin:20px 0 0;color:#94a3b8;font-size:13px">Sasha AI · admin notification</p>
      </div>`;

    const res = await fetch(`${GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Sasha AI <onboarding@resend.dev>",
        to: ADMIN_EMAILS,
        subject,
        html,
      }),
    });
    const body = await res.text();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
