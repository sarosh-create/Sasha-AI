import { defineTool } from "@lovable.dev/mcp-js";
import { fail, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "get_progress",
  title: "Get progress",
  description: "Summarise the student's recent progress: latest quizzes, study minutes and mistake journal topics.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Not authenticated");
    const sb = supabaseForUser(ctx);
    const [quizzes, logs, mistakes] = await Promise.all([
      sb.from("quizzes").select("topic, score, total, completed, created_at").order("created_at", { ascending: false }).limit(10),
      sb.from("study_logs").select("activity, minutes, created_at").order("created_at", { ascending: false }).limit(20),
      sb.from("mistake_journal").select("topic, why_wrong, created_at").order("created_at", { ascending: false }).limit(15),
    ]);
    const err = quizzes.error ?? logs.error ?? mistakes.error;
    if (err) return fail(err.message);
    const totalMinutes = (logs.data ?? []).reduce((sum, l) => sum + (l.minutes ?? 0), 0);
    return text({
      recent_quizzes: quizzes.data ?? [],
      recent_sessions: logs.data ?? [],
      recent_minutes: totalMinutes,
      mistakes: mistakes.data ?? [],
    });
  },
});
