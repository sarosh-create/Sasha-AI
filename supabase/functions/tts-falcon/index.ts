import { getAuthedUser, unauthorized } from "../_shared/auth.ts";
// ElevenLabs TTS for the Talking Falcon. Returns MP3 audio bytes.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const user = await getAuthedUser(req);
  if (!user) return unauthorized(cors);
  try {
    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const voice = voiceId || "JBFqnCBsd6RMkjVDRZzb"; // George — warm, mentor-like
    const trimmed = text.slice(0, 600);
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true, speed: 1.05 },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "tts failed", detail: t.slice(0, 300) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(r.body, { headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
