// Generate an AI draft for a lesson (slides + mini-quiz) and save it.
// Called when a student opens a lesson that has no published content yet.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Verify caller is authenticated and is staff/teacher before doing any work
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { data: isStaff } = await userClient.rpc("is_staff_or_teacher", { _user_id: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { subject, topic, grade_level, exam_board } = await req.json();
    if (!subject || !topic || typeof subject !== "string" || typeof topic !== "string" || subject.length > 200 || topic.length > 300) {
      return new Response(JSON.stringify({ error: "subject and topic required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supa = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);


    // existing draft/published?
    const { data: existing } = await supa
      .from("lesson_content")
      .select("*")
      .eq("subject_name", subject)
      .eq("topic", topic)
      .eq("grade_level", grade_level ?? "")
      .eq("exam_board", exam_board ?? "")
      .limit(1)
      .maybeSingle();
    if (existing) return new Response(JSON.stringify({ lesson: existing }), { headers: { ...cors, "Content-Type": "application/json" } });

    const sys = `You are an expert tutor that creates Duolingo-style mini-lessons. Output STRICT JSON only matching this shape:
{
  "slides": [ { "title": string, "body": string, "emoji": string } ],
  "worked_example": string,
  "quiz": [ { "question": string, "options": [string,string,string,string], "answer_index": number, "explanation": string } ]
}
Rules:
- 4-6 slides, each <= 60 words, fun and visual; use vivid analogies and labelled descriptions (e.g. "A plant cell is a tiny city: nucleus = mayor, mitochondria = power plants").
- worked_example: one short solved example or labelled diagram in plain text.
- 4 quiz questions, exam-style, exactly 4 options each, answer_index 0-3.
- Tailor depth to the student's level: ${grade_level || "general"} / board ${exam_board || "general"}.
- No markdown fences. Output JSON only.`;
    const usr = `Subject: ${subject}\nTopic: ${topic}\nLevel: ${grade_level || "general"}\nBoard: ${exam_board || "general"}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("lesson-draft AI gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content;
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { slides: [], quiz: [] }; }

    const { data: saved, error } = await supa.from("lesson_content").insert({
      subject_name: subject, topic, grade_level: grade_level ?? "", exam_board: exam_board ?? "",
      slides: parsed.slides ?? [], worked_example: parsed.worked_example ?? "", quiz: parsed.quiz ?? [],
      status: "draft",
    }).select().single();
    if (error) { console.error("lesson-draft insert error", error); return new Response(JSON.stringify({ error: "Failed to save lesson" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } }); }

    return new Response(JSON.stringify({ lesson: saved }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("lesson-draft error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
