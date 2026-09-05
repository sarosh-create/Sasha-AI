/**
 * Daily study nudge — "here's what to do next, and your exam is in N days".
 * Called by pg_cron each morning.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          adminClient,
          authorizeCron,
          daysUntil,
          emailsForUsers,
          escapeHtml,
          sendEmail,
          shell,
        } = await import("@/lib/emails.server");

        if (!authorizeCron(request)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const admin = adminClient();
        const cutoff = new Date(Date.now() - 20 * 3600_000).toISOString();

        const { data: profiles, error } = await admin
          .from("profiles")
          .select("user_id, display_name, exam_date, streak_count, daily_minutes_goal, last_daily_email_at")
          .eq("email_daily_reminders", true)
          .or(`last_daily_email_at.is.null,last_daily_email_at.lt.${cutoff}`)
          .limit(300);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = profiles ?? [];
        const emails = await emailsForUsers(admin, rows.map((p) => p.user_id));
        let sent = 0;

        for (const p of rows) {
          const to = emails.get(p.user_id);
          if (!to) continue;

          const [{ data: next }, { data: weakest }] = await Promise.all([
            admin
              .from("lesson_path")
              .select("title, activity, est_minutes")
              .eq("user_id", p.user_id)
              .eq("status", "pending")
              .order("position", { ascending: true })
              .limit(1),
            admin
              .from("mistake_journal")
              .select("topic")
              .eq("user_id", p.user_id)
              .order("created_at", { ascending: false })
              .limit(1),
          ]);

          const step = next?.[0];
          const weakTopic = weakest?.[0]?.topic;
          const left = daysUntil(p.exam_date);
          const name = p.display_name || "there";

          const bits: string[] = [];
          if (left !== null) {
            bits.push(
              `<div style="background:#1e293b;border-radius:12px;padding:14px 16px;margin:0 0 12px">
                 <div style="color:#fbbf24;font-size:26px;font-weight:800">${left} day${left === 1 ? "" : "s"}</div>
                 <div style="color:#94a3b8;font-size:13px">until your exam</div>
               </div>`,
            );
          }
          bits.push(
            `<div style="background:#1e293b;border-radius:12px;padding:14px 16px;margin:0 0 12px">
               <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.1em">Do this next</div>
               <div style="color:#f1f5f9;font-size:16px;font-weight:600;margin-top:6px">${escapeHtml(
                 step?.title ?? "Start a quick quiz on your weakest topic",
               )}</div>
               <div style="color:#94a3b8;font-size:13px;margin-top:4px">${escapeHtml(
                 step ? `${step.activity} · about ${step.est_minutes} min` : `About ${p.daily_minutes_goal} min`,
               )}</div>
             </div>`,
          );
          if (weakTopic) {
            bits.push(
              `<div style="color:#cbd5e1;font-size:14px;margin:0 0 12px">Still shaky on <strong style="color:#fbbf24">${escapeHtml(
                weakTopic,
              )}</strong> — five minutes there beats an hour on what you already know.</div>`,
            );
          }
          if (p.streak_count > 0) {
            bits.push(
              `<div style="color:#cbd5e1;font-size:14px">🔥 ${p.streak_count}-day streak. Don't break it today.</div>`,
            );
          }
          bits.push(
            `<a href="https://sashaai.lovable.app/dashboard" style="display:inline-block;margin-top:18px;background:#fbbf24;color:#0f172a;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none">Open today's plan</a>`,
          );

          const res = await sendEmail(
            to,
            left !== null && left <= 30
              ? `${left} days to your exam, ${name} — today's plan`
              : `Your study plan for today, ${name}`,
            shell(`Morning, ${name} 👋`, bits.join("")),
          );
          if (res.ok) {
            sent++;
            await admin
              .from("profiles")
              .update({ last_daily_email_at: new Date().toISOString() })
              .eq("user_id", p.user_id);
          }
        }

        return new Response(JSON.stringify({ ok: true, candidates: rows.length, sent }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
