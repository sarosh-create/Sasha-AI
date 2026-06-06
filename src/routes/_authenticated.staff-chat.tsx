import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin, useRoles } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Shield, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff-chat")({
  head: () => ({ meta: [{ title: "Staff Chat — Sasha AI" }] }),
  component: StaffChatPage,
});

type Msg = { id: string; user_id: string; body: string; created_at: string };

function StaffChatPage() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isTeacher } = useRoles();
  const canChat = isAdmin || isTeacher;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("staff_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) { toast.error(error.message); return; }
    setMsgs((data as Msg[]) ?? []);
    const ids = Array.from(new Set((data ?? []).map((m: any) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p.display_name ?? "Staff"));
      setNames(map);
    }
  };

  useEffect(() => {
    if (!canChat) return;
    load();
    const ch = supabase
      .channel("staff_messages_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canChat]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("staff_messages").insert({ user_id: user.id, body: text.trim() });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("staff_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!canChat) {
    return (
      <div className="container mx-auto max-w-xl p-10 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Staff only</h1>
        <p className="mt-1 text-sm text-muted-foreground">This chat is for admins, co-admins and teachers.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-semibold">Staff chat</h1>
        <span className="ml-auto text-xs text-muted-foreground">Private — admins & teachers only</span>
      </div>
      <Card className="flex-1 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet. Say hi 👋</p>}
        <div className="space-y-3">
          {msgs.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <span>{names[m.user_id] ?? "Staff"}</span>
                    <span>· {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {mine && (
                      <button onClick={() => del(m.id)} className="ml-auto opacity-0 transition group-hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </Card>
      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message your team…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={sending || !text.trim()}>
          <Send className="mr-1 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
