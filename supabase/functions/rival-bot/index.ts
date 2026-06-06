// Rival System — generates the AI rival's quiz score and a taunt/encouragement.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { user_score, total, rival_level = 1, topic = "study", history = [] } = await req.json();
    if (typeof user_score !== "number" || typeof total !== "number")
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Rival skill grows with level. Slight randomness.
    const base = Math.min(0.95, 0.45 + rival_level * 0.05);
    const noise = (Math.random() - 0.5) * 0.15;
    const rival_pct = Math.max(0.1, Math.min(1, base + noise));
    const rival_score = Math.round(rival_pct * total);
    const user_won = user_score > rival_score;
    const tie = user_score === rival_score;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ rival_score, user_won, tie, taunt: user_won ? "You beat me — for now." : "Better luck next round, friend." }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are 'Echo' — a friendly but competitive AI rival student. Write ONE short line (max 18 words) reacting to a quiz result. Tone: playful, sporty, never mean. Reference the topic when natural." },
          { role: "user", content: `Topic: ${topic}\nMe (rival): ${Math.round(rival_pct * 100)}%\nThem (real student): ${Math.round((user_score / Math.max(total,1)) * 100)}%\nOutcome: ${user_won ? "they beat me" : tie ? "we tied" : "I won"}\nRecent history: ${JSON.stringify(history.slice(-3))}` },
        ],
      }),
    });
    let taunt = user_won ? "Nice round. I'll bring it next time." : tie ? "Dead heat! Rematch?" : "Caught you napping that round.";
    if (resp.ok) {
      const data = await resp.json();
      taunt = data.choices?.[0]?.message?.content ?? taunt;
    }
    return new Response(JSON.stringify({ rival_score, rival_pct, user_won, tie, taunt }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
