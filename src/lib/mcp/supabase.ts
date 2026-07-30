import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Supabase client scoped to the MCP caller's verified token, so RLS runs as that user. */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function text(value: unknown) {
  return {
    content: [
      { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
    ],
  };
}

export function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}
