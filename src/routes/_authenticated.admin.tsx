import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, Mail, MessageCircle, Trash2, Plus, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Sasha AI" }] }),
  component: AdminPage,
});

type Row = Record<string, any>;

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="font-display text-3xl font-semibold">Admin panel</h1>
      <p className="mb-6 text-sm text-muted-foreground">Manage teachers, live classes, events, schemes, and videos.</p>
      <Tabs defaultValue="classes">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="classes">Live classes</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="assign">Assign students</TabsTrigger>
          <TabsTrigger value="coadmins">Co-admins</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
          <TabsTrigger value="papers">Past papers</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>
        <TabsContent value="classes"><LiveClassesAdmin /></TabsContent>
        <TabsContent value="applications"><TeacherApplicationsAdmin /></TabsContent>
        <TabsContent value="teachers"><TeachersAdmin /></TabsContent>
        <TabsContent value="assign"><AssignStudentsAdmin /></TabsContent>
        <TabsContent value="coadmins"><CoAdminsAdmin /></TabsContent>
        <TabsContent value="events"><EventsAdmin /></TabsContent>
        <TabsContent value="schemes"><SchemesAdmin /></TabsContent>
        <TabsContent value="papers"><PastPapersAdmin /></TabsContent>
        <TabsContent value="channels"><ChannelsAdmin /></TabsContent>
        <TabsContent value="videos"><VideosAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

function useTable(table: string, order = "created_at") {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table as any).select("*").order(order, { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [table]);
  return { rows, loading, reload };
}

async function del(table: string, id: string, reload: () => void) {
  if (!confirm("Delete this item?")) return;
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) toast.error(error.message);
  else { toast.success("Deleted"); reload(); }
}

function TeacherApplicationsAdmin() {
  const { rows, reload } = useTable("teacher_applications");
  const { user } = useAuth();

  const approve = async (application: Row) => {
    const teacherPayload = {
      user_id: application.user_id,
      name: application.name,
      email: application.email,
      subject: application.subjects,
      bio: [application.qualifications, application.message].filter(Boolean).join("\n\n") || null,
    } as any;
    await supabase.from("teachers").delete().eq("user_id", application.user_id);
    const { error: teacherError } = await supabase.from("teachers").insert(teacherPayload);
    if (teacherError) return toast.error(teacherError.message);
    const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: application.user_id, role: "teacher" } as any, { onConflict: "user_id,role" });
    if (roleError) return toast.error(roleError.message);
    await supabase.from("profiles").update({ account_type: "teacher" } as any).eq("user_id", application.user_id);
    const { error } = await supabase.from("teacher_applications" as any).update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", application.id);
    if (error) return toast.error(error.message);
    toast.success("Teacher approved and added");
    reload();
  };

  const reject = async (application: Row) => {
    const { error } = await supabase.from("teacher_applications" as any).update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", application.id);
    if (error) return toast.error(error.message);
    toast.success("Application rejected");
    reload();
  };

  return (
    <div className="mt-4 space-y-3">
      {rows.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No teacher applications yet.</Card>}
      {rows.map((application) => (
        <Card key={application.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{application.name}</p>
              <p className="text-sm text-muted-foreground">{application.email} · {application.subjects}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">{application.status}</span>
          </div>
          {application.qualifications && <p className="text-sm"><b>Experience:</b> {application.qualifications}</p>}
          {application.message && <p className="text-sm"><b>Message:</b> {application.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><a href={`mailto:${application.email}`}><Mail className="h-4 w-4" /> Email</a></Button>
            <Button asChild size="sm" variant="outline"><a href={`mailto:${application.email}?subject=Sasha AI teacher chat`}><MessageCircle className="h-4 w-4" /> Chat by email</a></Button>
            {application.status !== "approved" && <Button size="sm" onClick={() => approve(application)}><CheckCircle2 className="h-4 w-4" /> Approve</Button>}
            {application.status === "pending" && <Button size="sm" variant="destructive" onClick={() => reject(application)}><XCircle className="h-4 w-4" /> Reject</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TeachersAdmin() {
  const { rows, reload } = useTable("teachers");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const add = async () => {
    if (!name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("teachers").insert({ name, email, subject, bio, avatar_url: avatar } as any);
    if (error) return toast.error(error.message);
    setName(""); setEmail(""); setSubject(""); setBio(""); setAvatar(""); toast.success("Teacher added"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Add teacher</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Avatar URL</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Add teacher</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{t.name} {t.subject && <span className="text-muted-foreground">· {t.subject}</span>}</p>
              {t.bio && <p className="text-xs text-muted-foreground">{t.bio}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del("teachers", t.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LiveClassesAdmin() {
  const { rows, reload } = useTable("live_classes", "scheduled_at");
  const { rows: teachers } = useTable("teachers");
  const [form, setForm] = useState({ title: "", description: "", subject: "", scheduled_at: "", duration_minutes: 60, meeting_url: "", video_url: "", teacher_id: "" });
  const { user } = useAuth();
  const add = async () => {
    if (!form.title || !form.scheduled_at) return toast.error("Title and time required");
    const { error } = await supabase.from("live_classes").insert({
      ...form,
      teacher_id: form.teacher_id || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", description: "", subject: "", scheduled_at: "", duration_minutes: 60, meeting_url: "", video_url: "", teacher_id: "" });
    toast.success("Class scheduled"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Schedule a live class</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>When</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
          <div>
            <Label>Teacher</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
              <option value="">— none —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><Label>Meeting URL</Label><Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet…" /></div>
          <div className="sm:col-span-2"><Label>Video URL (recording)</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Add class</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.scheduled_at).toLocaleString()} · {c.duration_minutes}min{c.subject ? ` · ${c.subject}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del("live_classes", c.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventsAdmin() {
  const { rows, reload } = useTable("events", "starts_at");
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", starts_at: "", ends_at: "", location: "", url: "", image_url: "" });
  const add = async () => {
    if (!form.title || !form.starts_at) return toast.error("Title and time required");
    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description,
      starts_at: form.starts_at,
      ends_at: form.ends_at || null,
      location: form.location,
      url: form.url,
      image_url: form.image_url,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", description: "", starts_at: "", ends_at: "", location: "", url: "", image_url: "" });
    toast.success("Event added"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Add event</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
          <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Add event</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((e) => (
          <Card key={e.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()}{e.location ? ` · ${e.location}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del("events", e.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SchemesAdmin() {
  const { rows, reload } = useTable("schemes");
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", subject: "", image_url: "" });
  const add = async () => {
    if (!form.title) return toast.error("Title required");
    const { error } = await supabase.from("schemes").insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    setForm({ title: "", description: "", subject: "", image_url: "" }); toast.success("Scheme added"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Add scheme</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Add scheme</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{s.title}</p>
              {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del("schemes", s.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VideosAdmin() {
  const { rows, reload } = useTable("explainer_reels");
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", topic: "", video_url: "", thumbnail_url: "" });
  const add = async () => {
    if (!form.title || !form.video_url) return toast.error("Title and video URL required");
    const { error } = await supabase.from("explainer_reels").insert({ ...form, user_id: user?.id, scenes: [] } as any);
    if (error) return toast.error(error.message);
    setForm({ title: "", topic: "", video_url: "", thumbnail_url: "" }); toast.success("Video added"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Add explainer video</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Video URL</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Add video</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((v) => (
          <Card key={v.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{v.title}</p>
              {v.topic && <p className="text-xs text-muted-foreground">{v.topic}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del("explainer_reels", v.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
