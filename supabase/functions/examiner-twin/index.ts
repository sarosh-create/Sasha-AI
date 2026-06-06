// Examiner Twin — strict exam-style marking with mark scheme breakdown.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { question, answer, max_marks = 6, subject = "General", examBoard = "general" } = await req.json();
    if (!question || typeof question !== "string" || question.length > 4000)
      return new Response(JSON.stringify({ error: "Invalid question" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (!answer || typeof answer !== "string" || answer.length > 8000)
      return new Response(JSON.stringify({ error: "Invalid answer" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are the Examiner Twin — a strict ${examBoard} ${subject} examiner. Mark answers exactly like the real mark scheme. Award marks only where keywords/concepts are explicit. Be fair but harsh. Always show where marks were lost and which examiner keywords were missing.` },
          { role: "user", content: `Question (max ${max_marks} marks):\n${question}\n\nStudent answer:\n${answer}\n\nMark it.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "mark_answer",
            description: "Return strict marking.",
            parameters: {
              type: "object",
              properties: {
                marks_awarded: { type: "number" },
                max_marks: { type: "number" },
                grade_band: { type: "string" },
                mark_breakdown: { type: "array", items: { type: "object", properties: {
                  point: { type: "string" }, awarded: { type: "boolean" }, reason: { type: "string" }
                }, required: ["point","awarded","reason"] } },
                missing_keywords: { type: "array", items: { type: "string" } },
                examiner_comments: { type: "string" },
                model_answer: { type: "string" },
                mistake_topic: { type: "string" },
                why_wrong: { type: "string" },
              },
              required: ["marks_awarded","max_marks","mark_breakdown","missing_keywords","examiner_comments","model_answer"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "mark_answer" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402)
        return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limited" : "AI credits exhausted" }), { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
      console.error("gateway err", await resp.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify(parsed ?? { error: "No result" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
