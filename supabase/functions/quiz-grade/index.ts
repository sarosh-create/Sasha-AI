import { getAuthedUser, unauthorized } from "../_shared/auth.ts";
// Strict grading with feedback via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const user = await getAuthedUser(req);
  if (!user) return unauthorized(corsHeaders);
  try {
    const parsedBody = await req.json();
    const quizId = typeof parsedBody.quiz_id === "string" ? parsedBody.quiz_id : "";
    const answers = Array.isArray(parsedBody.answers) ? parsedBody.answers.slice(0, 20) : [];
    if (!quizId) {
      return new Response(JSON.stringify({ error: "No quiz_id supplied" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Questions (and their correct answers) are ALWAYS read from the database for
    // the quiz owned by the caller — never taken from the request body — so a
    // client cannot forge correct answers to farm a perfect score.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const quizRes = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?id=eq.${encodeURIComponent(quizId)}&user_id=eq.${user.id}&select=questions`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const quizRows = quizRes.ok ? await quizRes.json() : [];
    const questions = Array.isArray(quizRows?.[0]?.questions) ? quizRows[0].questions.slice(0, 20) : [];
    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = questions.map((q: any, i: number) => ({
      index: i,
      type: q.type,
      prompt: String(q.prompt ?? "").slice(0, 2000),
      correct_answer: q.correct_answer,
      student_answer: String(answers?.[i] ?? "").slice(0, 4000),
    }));

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a STRICT exam marker. Mark each answer is_correct only if it fully matches the correct answer in meaning. Be unforgiving with vague or partial answers — call them incorrect and explain the gap in one sentence.",
        },
        { role: "user", content: JSON.stringify(items) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "grade",
            description: "Grade each answer strictly.",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      is_correct: { type: "boolean" },
                      feedback: { type: "string" },
                    },
                    required: ["index", "is_correct", "feedback"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string" },
              },
              required: ["results", "summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "grade" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("gateway err", t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args =
      data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { results: [], summary: "" };
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    parsed.score = results.filter((r: any) => r?.is_correct).length;
    parsed.total = questions.length;
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
