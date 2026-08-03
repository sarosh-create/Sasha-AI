import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { tutorSystemPrompt } from "@/lib/ai/system-prompts";
import { toast } from "sonner";
import { Send, Sparkles, Plus, StickyNote, History } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { bumpChallenge } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: TutorPage,
  head: () => ({
    meta: [
      { title: "AI Study Tutor — Sasha AI" },
      { name: "description", content: "Chat with your AI study tutor — get step-by-step teaching, instant checks for understanding, and saved notes." },
      { property: "og:title", content: "AI Study Tutor — Sasha AI" },
      { property: "og:description", content: "Step-by-step AI tutoring tailored to your subjects and exam date." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/tutor" }],
  }),
  validateSearch: (s: Record<string, unknown>): { subject?: string } =>
    typeof s.subject === "string" ? { subject: s.subject } : {},
});

type Msg = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

function TutorPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const subjectId = search.subject;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [systemCtx, setSystemCtx] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: subs }, { data: sess }] = await Promise.all([
        supabase.from("profiles").select("display_name, exam_board, exam_date").eq("user_id", user.id).maybeSingle(),
        supabase.from("subjects").select("name, strength_score").eq("user_id", user.id),
        supabase.from("chat_sessions").select("id, title, created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
      ]);
      setSystemCtx(
        tutorSystemPrompt({
          displayName: profile?.display_name,
          examBoard: profile?.exam_board,
          examDate: profile?.exam_date,
          subjects: subs ?? [],
        }),
      );
      setSessions(sess ?? []);
      if (sess && sess.length) {
        await openSession(sess[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const openSession = async (id: string) => {
    setSessionId(id);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", id)
      .order("created_at");
    setMessages((data as Msg[]) ?? []);
  };

  const newSession = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: "New session" })
      .select("id, title, created_at")
      .single();
    if (error) return toast.error(error.message);
    setSessions((s) => [data!, ...s]);
    setSessionId(data!.id);
    setMessages([]);
  };

  const saveAsNote = async (content: string) => {
    if (!user) return;
    let color = "#a78bfa";
    if (subjectId) {
      const { data: s } = await supabase.from("subjects").select("color").eq("id", subjectId).maybeSingle();
      if (s?.color) color = s.color;
    }
    const title = content.split("\n").find((l) => l.trim())?.slice(0, 80) ?? "Note from tutor";
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      subject_id: subjectId ?? null,
      tag: "key-idea",
      color,
      title,
      body: content,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved to notes");
  };

  const send = async () => {
    if (!input.trim() || !user) return;
    let sid = sessionId;
    if (!sid) {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title: input.slice(0, 60) })
        .select("id, title, created_at")
        .single();
      if (error) return toast.error(error.message);
      sid = data!.id;
      setSessionId(sid);
      setSessions((s) => [data!, ...s]);
    }

    const userMsg: Msg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    await supabase.from("chat_messages").insert({
      session_id: sid, user_id: user.id, role: "user", content: userMsg.content,
    });

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, system: systemCtx }),
      });
      if (resp.status === 429) { toast.error("Rate limit reached. Wait a moment."); setStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits to continue."); setStreaming(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, i);
          buffer = buffer.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || !line.trim()) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              acc += chunk;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      await supabase.from("chat_messages").insert({
        session_id: sid, user_id: user.id, role: "assistant", content: acc,
      });
      // log study activity
      await supabase.from("study_logs").insert({
        user_id: user.id, activity: "chat", minutes: 3,
      });
      await updateStreak(user.id);
      await bumpChallenge(user.id, "tutor3");
      await bumpChallenge(user.id, "study20", 3);
    } catch (e: any) {
      toast.error(e.message ?? "Stream failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3rem)]">
      <aside className="hidden w-64 border-r border-border bg-sidebar/40 p-3 md:flex md:flex-col">
        <Button onClick={newSession} variant="outline" size="sm" className="mb-3"><Plus className="h-4 w-4" /> New chat</Button>
        <ScrollArea className="flex-1">
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSession(s.id)}
                  className={`w-full truncate rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent ${
                    sessionId === s.id ? "bg-sidebar-accent font-medium" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones can't see the session rail — give them a sheet + new chat. */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><History className="h-4 w-4" /> Chats</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-3">
              <SheetHeader><SheetTitle>Your chats</SheetTitle></SheetHeader>
              <ul className="mt-3 space-y-1">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <SheetClose asChild>
                      <button
                        onClick={() => openSession(s.id)}
                        className={`w-full truncate rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent ${
                          sessionId === s.id ? "bg-sidebar-accent font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {s.title}
                      </button>
                    </SheetClose>
                  </li>
                ))}
                {sessions.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">No chats yet.</li>}
              </ul>
            </SheetContent>
          </Sheet>
          <Button onClick={newSession} variant="ghost" size="sm"><Plus className="h-4 w-4" /> New</Button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">

          <div className="mx-auto max-w-3xl space-y-5">
            <h1 className="sr-only">AI Study Tutor</h1>
            {messages.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
                <Sparkles className="mx-auto mb-3 h-6 w-6 text-accent" />
                <h2 className="font-display text-2xl font-semibold">Ask your mentor anything</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try: "Teach me photosynthesis step by step" or "Quiz me on quadratic equations".
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-card ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:font-display">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                  {m.role === "assistant" && m.content && (
                    <button
                      onClick={() => saveAsNote(m.content)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground opacity-0 transition group-hover:opacity-100 hover:bg-secondary/80"
                    >
                      <StickyNote className="h-3 w-3" /> Save as note
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border bg-background/80 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Ask anything about your subjects…"
              className="min-h-[44px] flex-1 resize-none"
              rows={1}
              disabled={streaming}
            />
            <Button onClick={send} disabled={streaming || !input.trim()} size="lg" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function updateStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: p } = await supabase
    .from("profiles")
    .select("streak_count, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (!p) return;
  if (p.last_active_date === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const nextStreak = p.last_active_date === yesterday ? (p.streak_count ?? 0) + 1 : 1;
  await supabase
    .from("profiles")
    .update({ streak_count: nextStreak, last_active_date: today })
    .eq("user_id", userId);
}
