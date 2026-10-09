/**
 * Flashcard maker — turns pasted notes or a topic into flashcards.
 * Anonymous visitors get a capped trial (shorter input, 10 cards);
 * signed-in callers (bearer token) get longer input and up to 30 cards.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function authedUserId(request: Request): Promise<string | null> {
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env["SUPABASE_URL"];
  const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!token || !url || !anon || token === anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anon } });
    if (!res.ok) return null;
    return (await res.json())?.id ?? null;
  } catch {
    return null;
  }
}

const Body = z.object({
  topic: z.string().trim().max(120).default(""),
  text: z.string().trim().max(20000).default(""),
  count: z.number().int().min(4).max(30).default(10),
});

export const Route = createFileRoute("/api/public/flashcards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch {
          return json({ error: "Please add a topic or some notes." }, 400);
        }
        if (input.topic.length < 2 && input.text.length < 20) return json({ error: "Please add a topic or some notes." }, 400);
        const userId = await authedUserId(request);
        const trial = !userId;
        const text = input.text.slice(0, trial ? 3000 : 20000);
        const count = Math.min(input.count, trial ? 10 : 30);
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "Flashcard maker isn't configured." }, 500);

        const schema = {
          type: "object", additionalProperties: false, required: ["title", "cards"],
          properties: {
            title: { type: "string" },
            cards: { type: "array", items: { type: "object", additionalProperties: false, required: ["front", "back"], properties: { front: { type: "string" }, back: { type: "string" } } } },
          },
        };
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: { "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            store: false,
            reasoning: { effort: "low" },
            instructions: `You are Sasha AI's flashcard maker for exam students. Make exactly ${count} accurate, exam-focused flashcards. Front: one clear question or term. Back: a concise, correct answer (max 40 words). Cover the most examinable points, no duplicates. Only use facts you are sure of.`,
            input: `Topic: ${input.topic || "(from notes)"}\n\nNotes:\n${text || "(none — use the topic)"}`,
            text: { format: { type: "json_schema", name: "flashcards", strict: true, schema } },
          }),
        });
        if (resp.status === 429) return json({ error: "Lots of students right now — try again in a minute." }, 429);
        if (resp.status === 402 || resp.status === 403) return json({ error: "The flashcard maker is temporarily unavailable." }, resp.status);
        if (!resp.ok || !resp.body) {
          console.error("flashcards AI", resp.status, await resp.text());
          return json({ error: "Couldn't make flashcards — please try again." }, 502);
        }
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "", out = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const l of lines) {
            if (!l.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(l.slice(5).trim());
              if (ev.type === "response.output_text.delta") out += ev.delta;
            } catch { /* keep-alive */ }
          }
        }
        try {
          const args = JSON.parse(out);
          const cards = (args.cards ?? []).slice(0, count).map((c: { front: string; back: string }) => ({ front: String(c.front).slice(0, 300), back: String(c.back).slice(0, 600) }));
          return json({ title: String(args.title || input.topic || "Flashcards").slice(0, 120), cards, trial });
        } catch {
          return json({ error: "Couldn't make flashcards — please try again." }, 502);
        }
      },
    },
  },
});
