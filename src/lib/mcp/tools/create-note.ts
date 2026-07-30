import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, supabaseForUser, text } from "../supabase";

export default defineTool({
  name: "create_note",
  title: "Create note",
  description: "Save a study note to the signed-in student's notebook.",
  inputSchema: {
    title: z.string().trim().describe("Short note title."),
    body: z.string().describe("Note content in plain text or markdown."),
    tag: z.string().optional().describe("Optional tag, e.g. the topic name."),
    subject_id: z.string().optional().describe("Optional subject id from list_subjects."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, body, tag, subject_id }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Not authenticated");
    if (!title) return fail("title is required");
    const { data, error } = await supabaseForUser(ctx)
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        title,
        body: body ?? "",
        ...(tag ? { tag } : {}),
        subject_id: subject_id ?? null,
      })
      .select("id, title, tag, created_at")
      .single();
    if (error) return fail(error.message);
    return text({ note: data });
  },
});
