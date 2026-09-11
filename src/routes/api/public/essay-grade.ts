/**
 * Essay grader / rechecker — marks a typed essay strictly against a board's
 * marking criteria, point by point.
 *
 * Anonymous visitors get a capped trial essay; signed-in students get the
 * full-length grader.
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

export const Route = createFileRoute("/api/public/essay-grade")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await authedUserId(request);
          const trial = !userId;
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

          const essay = String(payload["essay"] ?? "").slice(0, trial ? 4000 : 20000);
          if (essay.trim().length < 40) return json({ error: "Paste at least a paragraph of your essay." }, 400);

          const mode = payload["mode"] === "recheck" ? "recheck" : "grade";
          const board = String(payload["examBoard"] ?? "general").slice(0, 60);
          const subject = String(payload["subject"] ?? "English").slice(0, 60);
          const level = String(payload["level"] ?? "").slice(0, 60);
          const question = String(payload["question"] ?? "").slice(0, 800);
          const maxMarks = Number(payload["maxMarks"]);
          const claimed = Number(payload["claimed_marks"]);

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) return json({ error: "AI is not configured." }, 500);

          const system = `You are Sasha AI's Essay Examiner — a real ${board} ${subject}${level ? " " + level : ""} examiner marking an essay.
Apply that board's official essay marking grid: its assessment objectives / level descriptors, band boundaries, command-word demands, use of evidence, analysis vs description, structure, and accuracy of written communication.
Award marks band by band with the exact descriptor wording the board uses, and justify each band with quoted evidence from the essay.
${Number.isFinite(maxMarks) && maxMarks > 0 ? `The question is out of ${maxMarks} marks.` : "Infer the usual mark total for this board and essay type."}
${
  mode === "recheck"
    ? `This is a RECHECK: the essay was already marked${Number.isFinite(claimed) ? ` and given ${claimed} mark(s)` : ""}. Say clearly whether that mark was correct, too harsh or too generous, and justify every mark you would move.`
    : "This is a FIRST MARKING: mark it exactly as the board would, never generously."
}
${trial ? "This is a free trial: mark the essay but keep the rubric to the 3 most important criteria." : ""}
Be exam-accurate, specific and constructive. Never invent quotes.`;

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.7-flash",
              messages: [
                { role: "system", content: system },
                {
                  role: "user",
                  content: `Board: ${board}\nSubject: ${subject}${level ? `\nLevel: ${level}` : ""}${
                    question ? `\nEssay question: ${question}` : ""
                  }\n\nEssay:\n${essay}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "return_essay_marking",
                    description: "Return board-accurate essay marking.",
                    parameters: {
                      type: "object",
                      properties: {
                        total_awarded: { type: "number" },
                        total_available: { type: "number" },
                        grade_estimate: { type: "string" },
                        band: { type: "string" },
                        recheck_verdict: { type: "string" },
                        rubric: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              criterion: { type: "string" },
                              awarded: { type: "number" },
                              available: { type: "number" },
                              descriptor: { type: "string" },
                              evidence: { type: "string" },
                              how_to_improve: { type: "string" },
                            },
                            required: ["criterion", "awarded", "available", "descriptor", "how_to_improve"],
                          },
                        },
                        strengths: { type: "array", items: { type: "string" } },
                        lost_marks: { type: "array", items: { type: "string" } },
                        rewritten_paragraph: { type: "string" },
                        examiner_summary: { type: "string" },
                        next_steps: { type: "array", items: { type: "string" } },
                      },
                      required: [
                        "total_awarded",
                        "total_available",
                        "rubric",
                        "strengths",
                        "lost_marks",
                        "examiner_summary",
                        "next_steps",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "return_essay_marking" } },
            }),
          });

          if (!resp.ok) {
            if (resp.status === 429) return json({ error: "Rate limited — try again in a moment." }, 429);
            if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
            console.error("essay-grade gateway error", resp.status, await resp.text());
            return json({ error: "AI service error" }, 502);
          }

          const data = (await resp.json()) as any;
          const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const parsed = args ? JSON.parse(args) : null;
          if (!parsed) return json({ error: "Could not mark that essay — please try again." }, 422);
          if (trial) parsed.rubric = (parsed.rubric ?? []).slice(0, 3);
          return json({ ...parsed, trial });
        } catch (e) {
          console.error("essay-grade error", e);
          return json({ error: "Internal error" }, 500);
        }
      },
    },
  },
});
