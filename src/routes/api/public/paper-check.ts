/**
 * Paper Checker / Rechecker — marks a photographed answer sheet against a
 * board's real mark scheme.
 *
 * Signed-in callers (bearer token) get full multi-page marking; anonymous
 * visitors get a capped 2-question, single-image trial so they can judge the
 * marking quality before signing up.
 */
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function authedUserId(request: Request): Promise<string | null> {
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env["SUPABASE_URL"];
  const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!token || !url || !anon || token === anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/paper-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await authedUserId(request);
          const trial = !userId;
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

          const images = (Array.isArray(payload["images"]) ? (payload["images"] as unknown[]) : [])
            .filter((i): i is string => typeof i === "string" && i.startsWith("data:image/"))
            .slice(0, trial ? 1 : 4);
          if (images.length === 0) return json({ error: "Attach a clear photo of your work." }, 400);
          if (images.some((i) => i.length > 7_000_000))
            return json({ error: "Image too large — please use a smaller or more compressed photo." }, 413);

          const mode = payload["mode"] === "recheck" ? "recheck" : "check";
          const board = String(payload["examBoard"] ?? "general").slice(0, 60);
          const subject = String(payload["subject"] ?? "General").slice(0, 60);
          const level = String(payload["level"] ?? "").slice(0, 60);
          const notes = String(payload["notes"] ?? "").slice(0, 1500);
          const claimed = Number(payload["claimed_marks"]);

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) return json({ error: "AI is not configured." }, 500);

          const system = `You are Sasha AI's Paper Checker — a real ${board} ${subject}${level ? " " + level : ""} examiner.
Mark STRICTLY to the official ${board} mark scheme conventions for this subject and level: that board's command words, mark-point granularity, error-carried-forward rules, units and significant-figure rules, and quality-of-written-communication expectations.
Read every question and answer visible in the photo(s). If handwriting is unclear, say so rather than guessing.
${
  mode === "recheck"
    ? `This is a RECHECK: the work was already marked (marks may be written on the page${Number.isFinite(claimed) ? `; the student was given ${claimed} mark(s)` : ""}). Judge whether the original marking was correct and flag every mark wrongly awarded or wrongly withheld, with the exact mark-scheme justification.`
    : "This is a FIRST CHECK: mark it as the board would, awarding marks only where the required point is explicitly present."
}
${trial ? "Mark at most 2 questions; if more are present, mark the first 2 only." : ""}
Never invent marks. Be fair but exam-accurate.`;

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.7-flash",
              messages: [
                { role: "system", content: system },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Mark this ${subject} work for the ${board} board.${notes ? ` Student notes: ${notes}` : ""}`,
                    },
                    ...images.map((url) => ({ type: "image_url", image_url: { url } })),
                  ],
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "return_marking",
                    description: "Return board-accurate marking for the photographed work.",
                    parameters: {
                      type: "object",
                      properties: {
                        total_awarded: { type: "number" },
                        total_available: { type: "number" },
                        grade_estimate: { type: "string" },
                        legibility_warning: { type: "string" },
                        questions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              number: { type: "string" },
                              question_text: { type: "string" },
                              student_answer: { type: "string" },
                              marks_awarded: { type: "number" },
                              marks_available: { type: "number" },
                              mark_points: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    point: { type: "string" },
                                    awarded: { type: "boolean" },
                                    reason: { type: "string" },
                                  },
                                  required: ["point", "awarded", "reason"],
                                },
                              },
                              missing_keywords: { type: "array", items: { type: "string" } },
                              model_answer: { type: "string" },
                              recheck_verdict: { type: "string" },
                            },
                            required: [
                              "number",
                              "marks_awarded",
                              "marks_available",
                              "mark_points",
                              "missing_keywords",
                              "model_answer",
                            ],
                          },
                        },
                        examiner_summary: { type: "string" },
                        next_steps: { type: "array", items: { type: "string" } },
                      },
                      required: ["total_awarded", "total_available", "questions", "examiner_summary", "next_steps"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "return_marking" } },
            }),
          });

          if (!resp.ok) {
            if (resp.status === 429) return json({ error: "Rate limited — try again in a moment." }, 429);
            if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
            console.error("paper-check gateway error", resp.status, await resp.text());
            return json({ error: "AI service error" }, 502);
          }

          const data = (await resp.json()) as any;
          const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const parsed = args ? JSON.parse(args) : null;
          if (!parsed) return json({ error: "Could not read that page — try a clearer photo." }, 422);
          if (trial) parsed.questions = (parsed.questions ?? []).slice(0, 2);
          return json({ ...parsed, trial });
        } catch (e) {
          console.error("paper-check error", e);
          return json({ error: "Internal error" }, 500);
        }
      },
    },
  },
});
