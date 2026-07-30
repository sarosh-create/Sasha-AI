import { defineTool } from "@lovable.dev/mcp-js";
import { fail, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "list_subjects",
  title: "List subjects",
  description: "List the signed-in student's subjects with priority and strength score.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("subjects")
      .select("id, name, priority, strength_score")
      .order("priority", { ascending: false });
    if (error) return fail(error.message);
    return text({ subjects: data ?? [] });
  },
});
