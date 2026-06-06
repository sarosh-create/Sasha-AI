// Learning DNA Updater — reads recent activity, refreshes the student's DNA profile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await sb.auth.getUser();
    const user = ud.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const [{ data: subjects }, { data: quizzes }, { data: logs }, { data: mistakes }] = await Promise.all([
      sb.from("subjects").select("name, strength_score").eq("user_id", user.id),
      sb.from("quizzes").select("topic, score, total, completed").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      sb.from("study_logs").select("activity, minutes, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      sb.from("mistake_journal").select("topic, why_wrong").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a learning scientist. Build a 'Learning DNA' profile from a student's recent activity. Be specific. Reference their actual subjects." },
          { role: "user", content: JSON.stringify({ subjects, quizzes, logs, mistakes }) },
        ],
        tools: [{ type: "function", function: { name: "build_dna", parameters: {
          type: "object",
          properties: {
            learning_style: { type: "string", enum: ["visual","practice","stories","repetition","discussion","teaching","simulation","reading"] },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            attention_minutes: { type: "number" },
            retention_score: { type: "number" },
            summary: { type: "string" },
          },
          required: ["learning_style","strengths","weaknesses","attention_minutes","retention_score","summary"],
          additionalProperties: false,
        } } }],
        tool_choice: { type: "function", function: { name: "build_dna" } },
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
    const dna = args ? JSON.parse(args) : null;
    if (dna) {
      await sb.from("learning_dna").upsert({
        user_id: user.id,
        learning_style: dna.learning_style,
        strengths: dna.strengths,
        weaknesses: dna.weaknesses,
        attention_minutes: Math.round(dna.attention_minutes),
        retention_score: Math.max(0, Math.min(100, Math.round(dna.retention_score))),
        summary: dna.summary,
      });
    }
    return new Response(JSON.stringify({ dna }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
