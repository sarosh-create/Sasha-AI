import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "list_study_path",
  title: "List study path",
  description: "List the student's guided study path lessons in order, with status and estimated minutes.",
  inputSchema: {
    status: z
      .enum(["all", "todo", "done"])
      .optional()
      .describe("Filter lessons by completion status. Defaults to all."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status = "all" }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("lesson_path")
      .select("id, title, topic, activity, status, est_minutes, position, completed_at")
      .order("position", { ascending: true });
    if (status === "done") query = query.eq("status", "done");
    if (status === "todo") query = query.neq("status", "done");
    const { data, error } = await query;
    if (error) return fail(error.message);
    return text({ lessons: data ?? [] });
  },
});
