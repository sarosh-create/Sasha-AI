/**
 * Server-only email helpers.
 *
 * Two scheduled sends keep students coming back:
 *  - a daily nudge ("study this next, your exam is in N days")
 *  - a weekly digest (mastery gains, quiz performance, next week's focus)
 *
 * Both are triggered by pg_cron hitting the public hook routes.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FROM = "Sasha AI <onboarding@resend.dev>";

export function adminClient(): SupabaseClient {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** pg_cron authenticates with the project's publishable/anon key. */
export function authorizeCron(request: Request): boolean {
  const key =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const expected = [process.env["SUPABASE_ANON_KEY"], process.env["SUPABASE_PUBLISHABLE_KEY"]].filter(
    Boolean,
  ) as string[];
  return expected.some((e) => e.length > 0 && e === key);
}

export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date + "T00:00:00Z").getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function shell(title: string, inner: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:28px;background:#0f172a;color:#e2e8f0;border-radius:18px">
    <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#fbbf24;font-weight:700">Sasha AI</div>
    <h1 style="margin:8px 0 18px;font-size:22px;color:#f8fafc">${escapeHtml(title)}</h1>
    ${inner}
    <p style="margin:26px 0 0;font-size:12px;color:#64748b">
      You're getting this because email reminders are on in your Sasha AI profile.
      Turn them off any time under Board &amp; subjects → Settings.
    </p>
  </div>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
  const RESEND_API_KEY = process.env["RESEND_API_KEY"];
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, status: 0, body: "email not configured" };
  }
  const res = await fetch(`${GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) console.error(`Resend failed [${res.status}]: ${body}`);
  return { ok: res.ok, status: res.status, body };
}

/** Resolve auth emails for a batch of user ids via the Auth Admin API. */
export async function emailsForUsers(admin: SupabaseClient, ids: string[]) {
  const map = new Map<string, string>();
  const wanted = new Set(ids);
  for (let page = 1; page <= 20 && wanted.size > 0; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if (u.email && wanted.has(u.id)) {
        map.set(u.id, u.email);
        wanted.delete(u.id);
      }
    }
    if (data.users.length < 200) break;
  }
  return map;
}

export type QuizRow = { topic: string; score: number | null; total: number; created_at: string };

export function topicStats(rows: QuizRow[]) {
  const byTopic = new Map<string, { pct: number[]; marked: number }>();
  for (const r of rows) {
    if (r.score == null || !r.total) continue;
    const entry = byTopic.get(r.topic) ?? { pct: [], marked: 0 };
    entry.pct.push(Math.round((r.score / r.total) * 100));
    entry.marked += r.total;
    byTopic.set(r.topic, entry);
  }
  return [...byTopic.entries()].map(([topic, v]) => {
    const first = v.pct[0] ?? 0;
    const latest = v.pct[v.pct.length - 1] ?? 0;
    const avg = Math.round(v.pct.reduce((a, b) => a + b, 0) / v.pct.length);
    return { topic, first, latest, avg, delta: latest - first, marked: v.marked, attempts: v.pct.length };
  });
}
