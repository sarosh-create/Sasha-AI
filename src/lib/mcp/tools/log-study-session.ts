import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "log_study_session",
  title: "Log study session",
  description: "Record a study session (activity plus minutes studied) for the signed-in student.",
  inputSchema: {
    activity: z.string().trim().describe("What the student studied, e.g. 'Revised photosynthesis'."),
    minutes: z.number().int().describe("Minutes spent studying."),
    subject_id: z.string().optional().describe("Optional subject id from list_subjects."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ activity, minutes, subject_id }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Not authenticated");
    if (!activity) return fail("activity is required");
    const mins = Math.max(1, Math.min(600, Math.round(minutes)));
    const { data, error } = await supabaseForUser(ctx)
      .from("study_logs")
      .insert({ user_id: ctx.getUserId(), activity, minutes: mins, subject_id: subject_id ?? null })
      .select("id, activity, minutes, created_at")
      .single();
    if (error) return fail(error.message);
    return text({ logged: data });
  },
});
