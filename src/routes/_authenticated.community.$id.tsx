import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/use-role";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageCircle, Send, ThumbsUp, Trash2, Shield, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/community/$id")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("chat_channels")
        .select("name, description")
        .eq("id", params.id)
        .maybeSingle();
      return { name: data?.name ?? null, description: data?.description ?? null };
    } catch {
      return { name: null, description: null };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.name?.trim();
    const title = name ? `${name} — Sasha AI community` : "Community channel — Sasha AI";
    const description =
      loaderData?.description?.trim() ||
      (name
        ? `Join the ${name} channel to discuss topics, share resources and get help from other students.`
        : "Discuss topics, share resources and get help inside a Sasha AI community channel.");
    return {
      meta: [
        { title: title.slice(0, 60) },
        { name: "description", content: description },
        { property: "og:title", content: title.slice(0, 60) },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://study-mentor-by-sarosh-ai.lovable.app/community/${params.id}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        {
          rel: "canonical",
          href: `https://study-mentor-by-sarosh-ai.lovable.app/community/${params.id}`,
        },
      ],
    };
  },
  component: ChannelPage,
});


type Msg = { id: string; user_id: string; body: string; created_at: string; pinned: boolean };

function ChannelPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { isStaff, isTeacher } = useRoles();
  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [myRatings, setMyRatings] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (ids: string[]) => {
    if (!ids.length) return;
    const missing = ids.filter((i) => !profiles[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", missing);
    const p: Record<string, any> = { ...profiles };
    (data ?? []).forEach((r: any) => (p[r.user_id] = r));
    setProfiles(p);
    const { data: rs } = await supabase.from("user_roles").select("user_id, role").in("user_id", missing);
    const rm: Record<string, string[]> = { ...roles };
    (rs ?? []).forEach((r: any) => { rm[r.user_id] = [...(rm[r.user_id] ?? []), r.role]; });
    setRoles(rm);
  };

  const loadRatings = async (ids: string[]) => {
    if (!ids.length) return;
    const [{ data: countRows }, { data: mineRows }] = await Promise.all([
      supabase.rpc("channel_message_rating_counts", { _message_ids: ids }),
      user
        ? supabase.from("channel_message_ratings").select("message_id").in("message_id", ids).eq("user_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const counts: Record<string, number> = {};
    (countRows ?? []).forEach((r: any) => { counts[r.message_id] = Number(r.count); });
    setRatings(counts);
    setMyRatings(new Set((mineRows ?? []).map((r: any) => r.message_id)));
  };


  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: c } = await supabase.from("chat_channels").select("*").eq("id", id).maybeSingle();
      setChannel(c);
      const { data: m, error: err } = await supabase.from("channel_messages").select("*").eq("channel_id", id).order("created_at");
      if (err) throw err;
      setMessages((m ?? []) as Msg[]);
      await loadProfiles(Array.from(new Set((m ?? []).map((x: any) => x.user_id))));
      await loadRatings((m ?? []).map((x: any) => x.id));
    } catch (e: any) {
      setError(e.message ?? "Failed to load channel");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const ch = supabase.channel(`channel:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${id}` }, async (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => [...prev, m]);
        await loadProfiles([m.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "channel_messages", filter: `channel_id=eq.${id}` }, (payload) => {
        setMessages((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [messages]);

  const send = async () => {
    if (!body.trim() || !user) return;
    const { error } = await supabase.from("channel_messages").insert({ channel_id: id, user_id: user.id, body: body.trim() });
    if (error) toast.error(error.message);
    else setBody("");
  };
  const rate = async (mid: string) => {
    if (!user) return;
    if (myRatings.has(mid)) {
      await supabase.from("channel_message_ratings").delete().eq("message_id", mid).eq("user_id", user.id);
      const next = new Set(myRatings); next.delete(mid); setMyRatings(next);
      setRatings({ ...ratings, [mid]: Math.max(0, (ratings[mid] ?? 1) - 1) });
    } else {
      await supabase.from("channel_message_ratings").insert({ message_id: mid, user_id: user.id, value: 1 });
      const next = new Set(myRatings); next.add(mid); setMyRatings(next);
      setRatings({ ...ratings, [mid]: (ratings[mid] ?? 0) + 1 });
    }
  };
  const remove = async (mid: string) => {
    if (!confirm("Delete message?")) return;
    await supabase.from("channel_messages").delete().eq("id", mid);
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center gap-2 border-b p-3">
        <Link to="/community"><Button size="icon" variant="ghost"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <p className="font-medium">{channel?.name ?? "Channel"}</p>
          {channel?.description && <p className="text-xs text-muted-foreground">{channel.description}</p>}
        </div>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-3/5 rounded-2xl" />
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={load} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No messages yet"
            description="Be the first to ask a question in this channel."
          />
        ) : messages.map((m) => {
          const isMine = m.user_id === user?.id;
          const author = profiles[m.user_id];
          const authorRoles = roles[m.user_id] ?? [];
          const isAdmin = authorRoles.includes("admin") || authorRoles.includes("co_admin");
          const isT = authorRoles.includes("teacher");
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[80%] p-3 ${isMine ? "bg-primary/10" : ""}`}>
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{author?.display_name ?? "User"}</span>
                  {isAdmin && <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"><Shield className="h-2.5 w-2.5" /> Admin</span>}
                  {isT && !isAdmin && <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"><GraduationCap className="h-2.5 w-2.5" /> Teacher</span>}
                  <span className="ml-auto">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => rate(m.id)} className={`flex items-center gap-1 text-xs ${myRatings.has(m.id) ? "text-primary" : "text-muted-foreground"}`}>
                    <ThumbsUp className="h-3 w-3" /> {ratings[m.id] ?? 0}
                  </button>
                  {(isMine || isStaff) && (
                    <button onClick={() => remove(m.id)} className="text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your question…" onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <Button onClick={send}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
