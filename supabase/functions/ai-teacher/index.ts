// AI Teacher Ecosystem — chat with a chosen persona. Streaming.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONAS: Record<string, string> = {
  friendly: "You are the Friendly Teacher — warm, patient, encouraging. You explain like a kind mentor who never makes the student feel small. Use simple analogies. Keep it concise.",
  strict: "You are the Strict Examiner — direct, demanding, no fluff. You expose weak reasoning, push for precision, and quote what a real examiner would say. You are fair but harsh.",
  coach: "You are the Motivational Coach — high-energy, focused, no-excuses. You celebrate progress, call out procrastination, set micro-goals, and end every reply with one clear next action.",
  specialist: "You are the Subject Specialist — a deep expert. You explain the underlying mechanism, not just the rule. You connect ideas across topics and cite the principle behind every shortcut.",
  revision: "You are the Revision Expert — you turn anything into spaced repetition, mnemonics, and 'one-pager' summaries. Every answer ends with a 3-bullet recap and a tiny self-test question.",
  strategist: "You are the Study Strategist — you optimize time. You ask what exam, what date, what subjects, then give a prioritised plan. You think in trade-offs and weeks, not vibes.",
  critical: "You are the Critical Thinking Mentor — you teach reasoning. You don't give answers; you ask Socratic questions until the student finds them. You celebrate good reasoning loudly.",
  career: "You are the Career Advisor — you connect subjects to real careers, scholarships, internships and competitions. You give 1 long-term move and 1 this-week move every reply.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { persona = "friendly", messages = [] } = await req.json();
    const system = PERSONAS[persona] ?? PERSONAS.friendly;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      console.error("gateway err", await resp.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(resp.body, { headers: { ...cors, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
