// Guardian Falcon — analyses recent activity and returns a "what to do next" plan.
// Public function (no JWT verification) — uses user_id passed from authed client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await sb.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const [{ data: subjects }, { data: quizzes }, { data: dna }, { data: profile }, { data: mistakes }] = await Promise.all([
      sb.from("subjects").select("name, strength_score").eq("user_id", user.id),
      sb.from("quizzes").select("topic, score, total, completed, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      sb.from("learning_dna").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("profiles").select("exam_board, year_group, target_grade").eq("user_id", user.id).maybeSingle(),
      sb.from("mistake_journal").select("topic, why_wrong, marks_lost").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const ctx = {
      profile: profile ?? {},
      subjects: subjects ?? [],
      recent_quizzes: quizzes ?? [],
      dna: dna ?? null,
      recent_mistakes: mistakes ?? [],
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are the Guardian Falcon — a sharp-eyed academic guardian. You watch a student's data and tell them exactly what to do next. Be specific, calm, encouraging, brief. Speak like a wise falcon: confident, never preachy. Always reference the student's actual weak subjects and recent mistakes by name." },
          { role: "user", content: `Student snapshot:\n${JSON.stringify(ctx, null, 2)}\n\nReturn a JSON plan.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "guardian_plan",
            description: "Return today's recommended plan.",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "One sentence: the most important thing right now." },
                readiness_pct: { type: "number" },
                stress_level: { type: "string", enum: ["calm", "stretched", "burnout-risk"] },
                today: { type: "array", items: { type: "object", properties: {
                  title: { type: "string" }, subject: { type: "string" }, minutes: { type: "number" }, why: { type: "string" }, kind: { type: "string", enum: ["revise","practice","new","rest","read"] }
                }, required: ["title","minutes","why","kind"] } },
                weak_focus: { type: "array", items: { type: "string" } },
                falcon_message: { type: "string" },
              },
              required: ["headline","readiness_pct","stress_level","today","weak_focus","falcon_message"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "guardian_plan" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limited" : "AI credits exhausted" }), { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
      }
      console.error("gateway err", await resp.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const plan = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify({ plan, context: ctx }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
