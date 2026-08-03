/**
 * Weekly progress digest — mastery gains, quiz performance, next week's focus.
 * Called by pg_cron every Sunday evening.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/weekly-digest")({
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
          topicStats,
        } = await import("@/lib/emails.server");

        if (!authorizeCron(request)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const admin = adminClient();
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString();

        const { data: profiles, error } = await admin
          .from("profiles")
          .select("user_id, display_name, exam_date, streak_count, xp, last_weekly_email_at")
          .eq("email_weekly_digest", true)
          .or(`last_weekly_email_at.is.null,last_weekly_email_at.lt.${cutoff}`)
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

          const [{ data: quizzes }, { data: logs }, { data: mistakes }] = await Promise.all([
            admin
              .from("quizzes")
              .select("topic, score, total, created_at")
              .eq("user_id", p.user_id)
              .eq("completed", true)
              .order("created_at", { ascending: true })
              .limit(200),
            admin
              .from("study_logs")
              .select("minutes, created_at")
              .eq("user_id", p.user_id)
              .gte("created_at", weekAgo)
              .limit(500),
            admin
              .from("mistake_journal")
              .select("topic")
              .eq("user_id", p.user_id)
              .gte("created_at", weekAgo)
              .limit(200),
          ]);

          const all = quizzes ?? [];
          const thisWeek = all.filter((q) => q.created_at >= weekAgo);
          // Nothing happened — don't send a hollow email.
          if (thisWeek.length === 0 && (logs ?? []).length === 0) continue;

          const minutes = (logs ?? []).reduce((a, l) => a + (l.minutes ?? 0), 0);
          const marked = thisWeek.reduce((a, q) => a + (q.total ?? 0), 0);
          const scored = thisWeek.reduce((a, q) => a + (q.score ?? 0), 0);
          const weekPct = marked ? Math.round((scored / marked) * 100) : null;

          const stats = topicStats(all).sort((a, b) => b.delta - a.delta);
          const gains = stats.filter((s) => s.delta > 0).slice(0, 3);
          const focus = [...stats].sort((a, b) => a.latest - b.latest).slice(0, 3);

          const missCount = new Map<string, number>();
          for (const m of mistakes ?? []) missCount.set(m.topic, (missCount.get(m.topic) ?? 0) + 1);
          const topMisses = [...missCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

          const left = daysUntil(p.exam_date);
          const name = p.display_name || "there";

          const stat = (label: string, value: string) =>
            `<td style="padding:12px 14px;background:#1e293b;border-radius:12px" width="33%">
               <div style="color:#fbbf24;font-size:22px;font-weight:800">${escapeHtml(value)}</div>
               <div style="color:#94a3b8;font-size:12px">${escapeHtml(label)}</div>
             </td>`;

          const list = (title: string, items: string[]) =>
            items.length
              ? `<div style="margin:18px 0 0">
                   <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.1em">${escapeHtml(title)}</div>
                   <ul style="margin:8px 0 0;padding-left:18px;color:#e2e8f0;font-size:14px;line-height:1.7">
                     ${items.map((i) => `<li>${i}</li>`).join("")}
                   </ul>
                 </div>`
              : "";

          const inner = `
            <table style="width:100%;border-collapse:separate;border-spacing:8px 0"><tr>
              ${stat("minutes studied", String(minutes))}
              ${stat("questions marked", String(marked))}
              ${stat("average score", weekPct === null ? "—" : `${weekPct}%`)}
            </tr></table>
            ${list(
              "Mastery gains",
              gains.map(
                (g) =>
                  `<strong style="color:#4ade80">+${g.delta}%</strong> on ${escapeHtml(g.topic)} (${g.first}% → ${g.latest}%)`,
              ),
            )}
            ${list(
              "Next week's focus",
              focus.map((f) => `${escapeHtml(f.topic)} — sitting at ${f.latest}%`),
            )}
            ${list(
              "Mistakes worth revisiting",
              topMisses.map(([t, n]) => `${escapeHtml(t)} · ${n} slip${n === 1 ? "" : "s"}`),
            )}
            ${
              left !== null
                ? `<div style="margin:18px 0 0;color:#fbbf24;font-size:14px;font-weight:600">${left} day${left === 1 ? "" : "s"} until your exam.</div>`
                : ""
            }
            <a href="https://study-mentor-by-sarosh-ai.lovable.app/progress" style="display:inline-block;margin-top:20px;background:#fbbf24;color:#0f172a;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none">See your mastery curve</a>`;

          const res = await sendEmail(to, `Your week in review, ${name}`, shell("This week's progress", inner));
          if (res.ok) {
            sent++;
            await admin
              .from("profiles")
              .update({ last_weekly_email_at: new Date().toISOString() })
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
