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

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            messages: [
              {
                role: "system",
                content: `You are Sasha AI's flashcard maker for exam students. Make exactly ${count} accurate, exam-focused flashcards. Front: one clear question or term. Back: a concise, correct answer (max 40 words). Cover the most examinable points, no duplicates. Only use facts you are sure of.`,
              },
              { role: "user", content: `Topic: ${input.topic || "(from notes)"}\n\nNotes:\n${text || "(none — use the topic)"}` },
            ],
            tools: [{
              type: "function",
              function: {
                name: "return_flashcards",
                description: "Return the flashcard deck.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    cards: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front", "back"] } },
                  },
                  required: ["title", "cards"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "return_flashcards" } },
          }),
        });
        if (resp.status === 429) return json({ error: "Lots of students right now — try again in a minute." }, 429);
        if (resp.status === 402) return json({ error: "The flashcard maker is temporarily unavailable." }, 402);
        if (!resp.ok) {
          console.error("flashcards AI", resp.status, await resp.text());
          return json({ error: "Couldn't make flashcards — please try again." }, 502);
        }
        const j = await resp.json();
        try {
          const args = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
          const cards = (args.cards ?? []).slice(0, count).map((c: { front: string; back: string }) => ({ front: String(c.front).slice(0, 300), back: String(c.back).slice(0, 600) }));
          return json({ title: String(args.title || input.topic || "Flashcards").slice(0, 120), cards, trial });
        } catch {
          return json({ error: "Couldn't make flashcards — please try again." }, 502);
        }
      },
    },
  },
});
