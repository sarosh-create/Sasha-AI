import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  visitorId: z.string().min(6).max(64),
  question: z.string().trim().min(2).max(600),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) }))
    .max(8)
    .optional(),
});

const SYSTEM = `You are Sasha AI's friendly front-desk helper on the public homepage. Answer visitors' questions about Sasha AI before they sign up, in 2–4 short sentences.
Sasha AI is a free AI study platform for exam students (Cambridge, Edexcel, AQA, OCR, IB, CBSE and more). Features: AI tutor with deep research, strictly board-marked quizzes, paper checker/rechecker from photos, essay grader, homework helper, math solver, study schedule generator, personalised study path, past papers, leaderboard, streaks, study rooms and community.
Signing up is free at /auth. If you don't know something, say an admin will follow up. Never invent prices or policies.`;

export const Route = createFileRoute("/api/public/visitor-chat")({
  server: {
    handlers: {
      // Visitors poll for admin replies using their random, unguessable visitor id.
      GET: async ({ request }) => {
        const vid = new URL(request.url).searchParams.get("visitorId") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(vid)) return Response.json({ replies: [] });
        const { adminClient } = await import("@/lib/emails.server");
        const { data } = await adminClient()
          .from("visitor_questions")
          .select("id, question, admin_reply, replied_at")
          .eq("visitor_id", vid)
          .not("admin_reply", "is", null)
          .order("replied_at", { ascending: true })
          .limit(50);
        return Response.json({ replies: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "Please type a question." }, { status: 400 });
        }
        const { adminClient } = await import("@/lib/emails.server");
        const admin = adminClient();

        // Light abuse guard: max 15 questions per visitor per hour.
        const since = new Date(Date.now() - 3600_000).toISOString();
        const { count } = await admin
          .from("visitor_questions")
          .select("id", { count: "exact", head: true })
          .eq("visitor_id", parsed.visitorId)
          .gte("created_at", since);
        if ((count ?? 0) >= 15) {
          return Response.json({ error: "You've asked a lot — sign up free to keep chatting with Sasha." }, { status: 429 });
        }

        let answer = "Thanks! An admin will get back to you soon — meanwhile you can sign up free to try everything.";
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              messages: [{ role: "system", content: SYSTEM }, ...(parsed.history ?? []), { role: "user", content: parsed.question }],
            }),
          });
          if (res.ok) {
            const j = await res.json();
            const text = j?.choices?.[0]?.message?.content;
            if (typeof text === "string" && text.trim()) answer = text.trim().slice(0, 2000);
          } else console.error("visitor-chat AI", res.status, await res.text());
        } catch (e) {
          console.error("visitor-chat AI error", e);
        }

        await admin.from("visitor_questions").insert({ visitor_id: parsed.visitorId, question: parsed.question, answer });
        return Response.json({ answer });
      },
    },
  },
});
