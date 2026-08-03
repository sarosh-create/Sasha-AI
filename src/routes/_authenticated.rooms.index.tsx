import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Video, Plus } from "lucide-react";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Study Rooms — Sasha AI" },
      { name: "description", content: "Join focused live study rooms and revise alongside other students." },
      { property: "og:title", content: "Study Rooms — Sasha AI" },
      { property: "og:description", content: "Join focused live study rooms and revise alongside other students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/rooms" }],
  }),
  component: RoomsIndex,
});

type Room = { id: string; name: string; subject: string | null; host_user_id: string; max_participants: number; created_at: string };

function RoomsIndex() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("study_rooms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      setRooms((data as Room[]) ?? []);
      if (data?.length) {
        const { data: parts } = await supabase
          .from("room_participants")
          .select("room_id")
          .in("room_id", data.map((r: any) => r.id));
        const c: Record<string, number> = {};
        (parts ?? []).forEach((p: any) => { c[p.room_id] = (c[p.room_id] ?? 0) + 1; });
        setCounts(c);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase
      .from("study_rooms")
      .insert({ name: name.trim(), subject: subject.trim() || null, host_user_id: user.id })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setOpen(false);
    setName(""); setSubject("");
    nav({ to: "/rooms/$id", params: { id: data!.id } });
  };

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Study rooms</h1>
          <p className="text-sm text-muted-foreground">Free, focused study sessions with text chat and video. Bring your friends.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a study room</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Room name (e.g. Biology cramming)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <div className="flex justify-end"><Button onClick={create}>Create & join</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <CardSkeletons count={4} className="mt-6" />
      ) : error ? (
        <ErrorState className="mt-10" description={error} onRetry={load} />
      ) : rooms.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Video className="h-6 w-6" />}
          title="No rooms yet"
          description="Be the first to host one."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New room</Button>}
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link to="/rooms/$id" params={{ id: r.id }} className="block rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{r.name}</p>
                    {r.subject && <p className="text-xs text-muted-foreground">{r.subject}</p>}
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    <Users className="h-3 w-3" /> {counts[r.id] ?? 0}/{r.max_participants}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Created {new Date(r.created_at).toLocaleString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
