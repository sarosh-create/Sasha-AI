import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export function VisitorChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Sasha. Ask me anything about how Sasha AI can help you study." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [vid, setVid] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("sasha:visitorId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sasha:visitorId", id);
    }
    setVid(id);
  }, []);
  const [replies, setReplies] = useState<{ id: string; question: string; admin_reply: string }[]>([]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!vid) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/public/visitor-chat?visitorId=${vid}`);
        const b = await r.json();
        if (!alive) return;
        const seen = Number(localStorage.getItem("sasha:visitorRepliesSeen") ?? 0);
        setReplies(b.replies ?? []);
        setUnread(Math.max(0, (b.replies?.length ?? 0) - seen));
      } catch { /* offline */ }
    };
    poll();
    const t = setInterval(poll, open ? 15000 : 60000);
    return () => { alive = false; clearInterval(t); };
  }, [vid, open]);
  useEffect(() => {
    if (open) { localStorage.setItem("sasha:visitorRepliesSeen", String(replies.length)); setUnread(0); }
  }, [open, replies.length]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, open]);

  const send = async () => {
    const q = text.trim();
    if (!q || busy || !vid) return;
    setText("");
    const history = msgs.slice(-6);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/public/visitor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: vid, question: q, history }),
      });
      const body = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: body.answer ?? body.error ?? "Something went wrong." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Couldn't reach Sasha — please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <p className="font-display text-sm font-semibold">Ask Sasha before you sign up</p>
            <button aria-label="Close chat" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {m.content}
              </div>
            ))}
            {replies.map((r) => (
              <div key={r.id} className="max-w-[90%] rounded-xl border border-primary/40 bg-background px-3 py-2 text-sm">
                <p className="text-xs font-semibold text-primary">Reply from the Sasha team</p>
                <p className="text-xs text-muted-foreground">Re: {r.question}</p>
                <p className="mt-1">{r.admin_reply}</p>
              </div>
            ))}
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="visitor-chat-input" className="sr-only">Your question</label>
            <Input id="visitor-chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" maxLength={600} />
            <Button type="submit" size="icon" aria-label="Send" disabled={busy}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} className="h-12 rounded-full px-4 shadow-pop" aria-label="Open chat with Sasha">
          <MessageCircle className="mr-2 h-5 w-5" /> {unread > 0 ? `${unread} new repl${unread === 1 ? "y" : "ies"}` : "Ask a question"}
        </Button>
      )}
    </div>
  );
}
