import { getAuthedUser, unauthorized } from "../_shared/auth.ts";
// Universal Content Converter — text -> chosen artifact type (notes/flashcards/mindmap/mcqs/summary/formula).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMAS: Record<string, any> = {
  notes: { type: "object", properties: { title: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, bullets: { type: "array", items: { type: "string" } } }, required: ["heading","bullets"] } } }, required: ["title","sections"] },
  flashcards: { type: "object", properties: { cards: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front","back"] } } }, required: ["cards"] },
  mindmap: { type: "object", properties: { root: { type: "string" }, branches: { type: "array", items: { type: "object", properties: { label: { type: "string" }, children: { type: "array", items: { type: "string" } } }, required: ["label","children"] } } }, required: ["root","branches"] },
  mcqs: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { question: { type: "string" }, choices: { type: "array", items: { type: "string" } }, correct: { type: "string" }, why: { type: "string" } }, required: ["question","choices","correct","why"] } } }, required: ["items"] },
  summary: { type: "object", properties: { tldr: { type: "string" }, key_points: { type: "array", items: { type: "string" } } }, required: ["tldr","key_points"] },
  formula: { type: "object", properties: { topic: { type: "string" }, formulas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, expression: { type: "string" }, when_to_use: { type: "string" } }, required: ["name","expression","when_to_use"] } } }, required: ["topic","formulas"] },
};

const TOOLS: Record<string, string> = {
  notes: "Extract detailed structured study notes with clear headings.",
  flashcards: "Produce 8-20 high-quality spaced-repetition flashcards.",
  mindmap: "Build a 1-root, 4-7 branch mind map. Each branch has 3-5 short children.",
  mcqs: "Generate 6 well-calibrated multiple-choice questions with 4 choices each.",
  summary: "Write a 2-3 sentence TL;DR plus 6-10 key bullet points.",
  formula: "Extract all formulas with name, expression, and when to use them.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const authedUser = await getAuthedUser(req);
  if (!authedUser) return unauthorized(cors);
  try {
    const { text, kind = "notes", title = "Untitled" } = await req.json();
    if (!text || typeof text !== "string" || text.length < 30 || text.length > 60000)
      return new Response(JSON.stringify({ error: "Text must be 30-60000 characters" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const schema = SCHEMAS[kind];
    if (!schema) return new Response(JSON.stringify({ error: "Invalid kind" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You convert source material into structured learning artifacts. ${TOOLS[kind]}` },
          { role: "user", content: `Title: ${title}\n\nSource:\n${text}` },
        ],
        tools: [{ type: "function", function: { name: "make_artifact", parameters: schema } }],
        tool_choice: { type: "function", function: { name: "make_artifact" } },
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
    return new Response(JSON.stringify({ kind, payload: parsed }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
