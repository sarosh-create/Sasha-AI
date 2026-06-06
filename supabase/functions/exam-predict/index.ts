// Exam Prediction Intelligence — analyses past papers + user data to produce
// "most likely to appear" topic list for a subject.
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
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await sb.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { subject_id } = await req.json();
    if (!subject_id) return new Response(JSON.stringify({ error: "subject_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const [{ data: subject }, { data: profile }, { data: papers }, { data: weak }] = await Promise.all([
      sb.from("subjects").select("name").eq("id", subject_id).maybeSingle(),
      sb.from("profiles").select("exam_board, year_group").eq("user_id", user.id).maybeSingle(),
      sb.from("past_papers").select("title, year, topics").eq("subject_id", subject_id).limit(20),
      sb.from("mistake_journal").select("topic").eq("user_id", user.id).eq("subject_id", subject_id).limit(30),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert exam analyst. Predict which topics are most likely to appear in the next exam based on past paper cycles, examiner trends, and the student's weak areas. Probabilities reflect realistic confidence — never above 95." },
          { role: "user", content: `Subject: ${subject?.name ?? "Unknown"}\nExam board: ${profile?.exam_board ?? "general"}\nYear group: ${profile?.year_group ?? "-"}\nPast papers seen:\n${JSON.stringify(papers ?? [])}\nStudent's recurring weak topics: ${JSON.stringify((weak ?? []).map(w => w.topic))}\n\nReturn 8 predicted topics ranked by probability.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "predict_topics",
            parameters: {
              type: "object",
              properties: {
                topics: { type: "array", items: { type: "object", properties: {
                  topic: { type: "string" },
                  probability: { type: "number" },
                  priority: { type: "string", enum: ["low","medium","high","critical"] },
                  reasoning: { type: "string" },
                }, required: ["topic","probability","priority","reasoning"] } },
              },
              required: ["topics"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "predict_topics" } },
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
    const parsed = args ? JSON.parse(args) : { topics: [] };

    // Replace old predictions for this subject
    await sb.from("exam_predictions").delete().eq("user_id", user.id).eq("subject_id", subject_id);
    if (parsed.topics?.length) {
      await sb.from("exam_predictions").insert(parsed.topics.map((t: any) => ({
        user_id: user.id, subject_id, topic: t.topic, probability: Math.round(t.probability), priority: t.priority, reasoning: t.reasoning,
      })));
    }
    return new Response(JSON.stringify(parsed), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
