import { getAuthedUser, unauthorized } from "../_shared/auth.ts";
// Generate a quiz via Lovable AI Gateway using tool calling for structured output
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
    const { subject, topic, count = 5, examBoard, style = "mix" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleInstruction =
      style === "short"
        ? "EVERY question must be type 'short' (typable open-ended answers). Do not produce any multiple-choice questions."
        : style === "mcq"
        ? "EVERY question must be type 'mcq' with 4 plausible choices. Do not produce any short-answer questions."
        : "Always include 1 short-answer and at least 1 multiple-choice. Mix freely.";

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            `You write rigorous, exam-style practice questions. ${styleInstruction} Calibrate difficulty to the exam board if given.`,
        },
        {
          role: "user",
          content: `Subject: ${subject}\nTopic: ${topic}\nExam board: ${examBoard ?? "general"}\nProduce ${count} questions.`,
        },
      ],

      tools: [
        {
          type: "function",
          function: {
            name: "make_quiz",
            description: "Return quiz questions.",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["mcq", "short"] },
                      prompt: { type: "string" },
                      choices: { type: "array", items: { type: "string" } },
                      correct_answer: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: ["type", "prompt", "correct_answer", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "make_quiz" } },
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
      if (resp.status === 429 || resp.status === 402) {
        return new Response(
          JSON.stringify({
            error: resp.status === 429 ? "Rate limited" : "AI credits exhausted",
          }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
    const parsed = args ? JSON.parse(args) : { questions: [] };
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
