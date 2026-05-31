import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { TAG_COLORS, TAG_LABELS, awardBadge, bumpChallenge } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

type Subject = { id: string; name: string; color: string };
type Note = {
  id: string; subject_id: string | null; tag: string; color: string;
  title: string; body: string; created_at: string;
};

function NotesPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [filterSub, setFilterSub] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ subject_id: "", tag: "key-idea", title: "", body: "" });

  const load = async () => {
    if (!user) return;
    const [{ data: subs }, { data: ns }] = await Promise.all([
      supabase.from("subjects").select("id, name, color").eq("user_id", user.id).order("name"),
      supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSubjects(subs ?? []);
    setNotes((ns as Note[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const subjectColor = (id: string | null) =>
    subjects.find((s) => s.id === id)?.color ?? "#a78bfa";
  const subjectName = (id: string | null) =>
    subjects.find((s) => s.id === id)?.name ?? "General";

  const create = async () => {
    if (!user || !draft.title.trim()) return;
    const sub = subjects.find((s) => s.id === draft.subject_id);
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      subject_id: draft.subject_id || null,
      tag: draft.tag,
      color: sub?.color ?? "#a78bfa",
      title: draft.title.trim(),
      body: draft.body,
    });
    if (error) return toast.error(error.message);
    await awardBadge(user.id, "first_note");
    await bumpChallenge(user.id, "note1");
    setOpen(false);
    setDraft({ subject_id: "", tag: "key-idea", title: "", body: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  const filtered = notes.filter(
    (n) =>
      (filterSub === "all" || n.subject_id === filterSub) &&
      (filterTag === "all" || n.tag === filterTag),
  );

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground">Color-coded by subject and tag.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> New note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={draft.subject_id} onValueChange={(v) => setDraft((d) => ({ ...d, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: s.color }} />
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={draft.tag} onValueChange={(v) => setDraft((d) => ({ ...d, tag: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TAG_LABELS).map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: TAG_COLORS[t] }} />
                      {TAG_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
              <Textarea placeholder="Write your note…" rows={6} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
              <div className="flex justify-end"><Button onClick={create}>Save note</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setFilterSub("all")} className={`rounded-full border px-3 py-1 text-xs ${filterSub === "all" ? "bg-primary text-primary-foreground" : "bg-card"}`}>All subjects</button>
        {subjects.map((s) => (
          <button key={s.id} onClick={() => setFilterSub(s.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${filterSub === s.id ? "ring-2 ring-ring" : ""}`}
            style={{ background: filterSub === s.id ? s.color + "22" : undefined }}>
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setFilterTag("all")} className={`rounded-full border px-3 py-1 text-xs ${filterTag === "all" ? "bg-primary text-primary-foreground" : "bg-card"}`}>All tags</button>
        {Object.keys(TAG_LABELS).map((t) => (
          <button key={t} onClick={() => setFilterTag(t)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${filterTag === t ? "ring-2 ring-ring" : ""}`}
            style={{ background: filterTag === t ? TAG_COLORS[t] + "22" : undefined }}>
            <span className="h-2 w-2 rounded-full" style={{ background: TAG_COLORS[t] }} />
            {TAG_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
          <StickyNote className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notes yet. Hit "New note" to start.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <div key={n.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5">
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: subjectColor(n.subject_id) }} />
              <div className="p-5 pl-6">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" style={{ background: TAG_COLORS[n.tag] + "22", borderColor: TAG_COLORS[n.tag], color: TAG_COLORS[n.tag] }}>
                    {TAG_LABELS[n.tag] ?? n.tag}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{subjectName(n.subject_id)}</span>
                </div>
                <h3 className="font-display text-lg font-semibold leading-tight">{n.title}</h3>
                {n.body && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">{n.body}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                  <button onClick={() => remove(n.id)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
