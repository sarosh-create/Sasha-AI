import { getAuthedUser, unauthorized } from "../_shared/auth.ts";
// Generates an avatar image via Lovable AI Gateway (Gemini nano-banana).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const user = await getAuthedUser(req);
  if (!user) return unauthorized(corsHeaders);
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fullPrompt = `A cute circular avatar portrait of: ${prompt}. Centered subject, vibrant magical aesthetic, soft glow, plain background, sticker style, square, high contrast.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `Gen failed: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) return new Response(JSON.stringify({ error: "No image data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
