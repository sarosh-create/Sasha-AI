// Teach-to-Learn — the student teaches, the AI plays a curious student and tests understanding.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { topic, transcript = [], round = 1 } = await req.json();
    if (!topic || typeof topic !== "string" || topic.length > 200)
      return new Response(JSON.stringify({ error: "Invalid topic" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const sys = `You are pretending to be a curious student learning "${topic}". The real student is the teacher. Your job: ask one increasingly difficult question per round to test their understanding. Round ${round} of difficulty. After 5+ rounds, if their explanations are strong, end with "MASTERED:" and a 2-sentence summary of what they taught well. Otherwise stay in student mode. Never give the answer yourself — only ask questions and react briefly.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          ...transcript,
        ],
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402)
        return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limited" : "AI credits exhausted" }), { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
      console.error("gateway err", await resp.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const mastered = text.startsWith("MASTERED:");
    return new Response(JSON.stringify({ reply: text.replace(/^MASTERED:\s*/, ""), mastered }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
