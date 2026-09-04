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
import { CheckCircle2, Mail, MessageCircle, Trash2, Plus, XCircle, Inbox, GraduationCap, Users, ShieldCheck, FileText, Hash, Video as VideoIcon, CalendarDays, BookOpen } from "lucide-react";
import { PageLoading, CardSkeletons, EmptyState, ErrorState } from "@/components/ui/states";
import { logAdminAction } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Sasha AI" },
      { name: "description", content: "Admin controls for managing students, roles, content and platform settings." },
      { property: "og:title", content: "Admin — Sasha AI" },
      { property: "og:description", content: "Admin controls for managing students, roles, content and platform settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/admin" }],
  }),
  component: AdminPage,
});

type Row = Record<string, any>;

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <PageLoading label="Loading admin panel…" />;
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
          <TabsTrigger value="invites">Role invites</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
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
        <TabsContent value="invites"><RoleInvitesAdmin /></TabsContent>
        <TabsContent value="audit"><AuditLogAdmin /></TabsContent>

      </Tabs>
    </div>
  );
}

function useTable(table: string, order = "created_at", columns = "*") {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from(table as any).select(columns).order(order, { ascending: false });
    if (err) { toast.error(err.message); setError(err.message); }
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [table]);
  return { rows, loading, error, reload };
}

// Teacher emails are column-revoked from normal reads; staff fetch them via a security-definer RPC.
const TEACHER_COLUMNS = "id,user_id,name,subject,bio,avatar_url,created_at";


async function del(table: string, id: string, reload: () => void) {
  if (!confirm("Delete this item?")) return;
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) toast.error(error.message);
  else { toast.success("Deleted"); reload(); }
}

function TeacherApplicationsAdmin() {
  const { rows, loading, error, reload } = useTable("teacher_applications");
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
    await logAdminAction(user, "approve_teacher_application", "teacher_applications", application.id, { email: application.email });
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
      {loading ? (
        <CardSkeletons count={3} className="sm:grid-cols-1 lg:grid-cols-1" />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="No teacher applications yet" />
      ) : rows.map((application) => (
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
  const { rows, loading, error, reload } = useTable("teachers", "created_at", TEACHER_COLUMNS);
  const [emails, setEmails] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.rpc("staff_list_teacher_emails").then(({ data }) => {
      const map: Record<string, string> = {};
      (data ?? []).forEach((t: any) => { if (t.email) map[t.id] = t.email; });
      setEmails(map);
    });
  }, [rows.length]);

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
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No teachers yet" description="Add a teacher above to get started." />
        ) : rows.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{t.name} {t.subject && <span className="text-muted-foreground">· {t.subject}</span>}</p>
              {emails[t.id] && <p className="text-xs text-muted-foreground">{emails[t.id]}</p>}

              {t.bio && <p className="text-xs text-muted-foreground">{t.bio}</p>}
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete teacher" onClick={() => del("teachers", t.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LiveClassesAdmin() {
  const { rows, loading, error, reload } = useTable("live_classes", "scheduled_at");
  const { rows: teachers } = useTable("teachers", "created_at", TEACHER_COLUMNS);
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
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No live classes scheduled" description="Schedule a class above." />
        ) : rows.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.scheduled_at).toLocaleString()} · {c.duration_minutes}min{c.subject ? ` · ${c.subject}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete live class" onClick={() => del("live_classes", c.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventsAdmin() {
  const { rows, loading, error, reload } = useTable("events", "starts_at");
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
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No events yet" description="Add an event above." />
        ) : rows.map((e) => (
          <Card key={e.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()}{e.location ? ` · ${e.location}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete event" onClick={() => del("events", e.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SchemesAdmin() {
  const { rows, loading, error, reload } = useTable("schemes");
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
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No schemes yet" description="Add a scheme above." />
        ) : rows.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{s.title}</p>
              {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete scheme" onClick={() => del("schemes", s.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VideosAdmin() {
  const { rows, loading, error, reload } = useTable("explainer_reels");
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
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<VideoIcon className="h-6 w-6" />} title="No explainer videos yet" description="Add a video above." />
        ) : rows.map((v) => (
          <Card key={v.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{v.title}</p>
              {v.topic && <p className="text-xs text-muted-foreground">{v.topic}</p>}
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete explainer reel" onClick={() => del("explainer_reels", v.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AssignStudentsAdmin() {
  const { rows: links, loading: linksLoading, error: linksError, reload } = useTable("teacher_students");
  const [teachers, setTeachers] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");
  useEffect(() => { (async () => {
    // Teachers can come from a role row OR from the teachers directory (approved
    // applications). Union both so the dropdown is never empty.
    const [{ data: rs }, { data: dir }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "teacher" as any),
      supabase.from("teachers").select("user_id, name"),
    ]);
    const dirRows = (dir ?? []).filter((d: any) => d.user_id);
    const tIds = Array.from(new Set([
      ...(rs ?? []).map((r: any) => r.user_id),
      ...dirRows.map((d: any) => d.user_id),
    ]));
    const { data: t } = tIds.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", tIds) : { data: [] } as any;
    const byId = new Map<string, any>();
    tIds.forEach((id) => byId.set(id, { user_id: id, display_name: null }));
    (t ?? []).forEach((p: any) => byId.set(p.user_id, p));
    dirRows.forEach((d: any) => {
      const cur = byId.get(d.user_id);
      if (cur && !cur.display_name) cur.display_name = d.name;
    });
    setTeachers(Array.from(byId.values()).map((r) => ({ ...r, display_name: r.display_name ?? r.user_id })));
    const { data: s } = await supabase.from("profiles").select("user_id, display_name, account_type").eq("account_type", "student");
    setStudents(s ?? []);
  })(); }, []);
  const link = async () => {
    if (!teacherId || !studentId) return toast.error("Pick both");
    const { error } = await supabase.from("teacher_students").insert({ teacher_user_id: teacherId, student_user_id: studentId });
    if (error) return toast.error(error.message);
    toast.success("Linked"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Link student to teacher</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Teacher</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">— pick —</option>
              {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.display_name}</option>)}
            </select>
          </div>
          <div><Label>Student</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">— pick —</option>
              {students.map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={link}><Plus className="h-4 w-4" /> Link</Button>
      </Card>
      <div className="space-y-1">
        {linksLoading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : linksError ? (
          <ErrorState description={linksError} onRetry={reload} />
        ) : links.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No students linked yet" description="Link a student to a teacher above." />
        ) : links.map((l) => (
          <Card key={l.id} className="flex items-center justify-between p-3 text-sm">
            <span>{teachers.find((t) => t.user_id === l.teacher_user_id)?.display_name ?? l.teacher_user_id} → {students.find((s) => s.user_id === l.student_user_id)?.display_name ?? l.student_user_id}</span>
            <Button size="icon" variant="ghost" aria-label="Delete teacher student" onClick={() => del("teacher_students", l.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CoAdminsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const reload = async () => {
    const { data: r } = await supabase.from("user_roles").select("user_id, role").eq("role", "co_admin" as any);
    const ids = (r ?? []).map((x: any) => x.user_id);
    if (!ids.length) { setRows([]); return; }
    const { data: p } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
    setRows(p ?? []);
  };
  useEffect(() => { reload(); }, []);
  const grant = async () => {
    if (!email.trim()) return;
    const { data: p } = await supabase.from("profiles").select("user_id").ilike("display_name", email).maybeSingle();
    let uid = p?.user_id;
    if (!uid) {
      const { data: bymail } = await supabase.from("teacher_applications").select("user_id").eq("email", email.trim()).maybeSingle();
      uid = bymail?.user_id;
    }
    if (!uid) return toast.error("User not found — they need to sign up first");
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "co_admin" as any });
    if (error) return toast.error(error.message);
    setEmail(""); toast.success("Co-admin granted"); reload();
  };
  const revoke = async (uid: string) => {
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "co_admin" as any);
    toast.success("Revoked"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Grant co-admin</h3>
        <p className="text-xs text-muted-foreground">Co-admins can create events, schemes, live classes and channels.</p>
        <div className="flex gap-2">
          <Input placeholder="display name or signup email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={grant}>Grant</Button>
        </div>
      </Card>
      <div className="space-y-1">
        {rows.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No co-admins yet" description="Grant co-admin access above." />
        ) : rows.map((r) => (
          <Card key={r.user_id} className="flex items-center justify-between p-3 text-sm">
            <span>{r.display_name}</span>
            <Button size="sm" variant="ghost" onClick={() => revoke(r.user_id)}>Revoke</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PastPapersAdmin() {
  const { rows, loading, error, reload } = useTable("past_papers");
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", exam_board: "", level: "", subject: "", year: new Date().getFullYear(), paper_type: "" });
  const [file, setFile] = useState<File | null>(null);
  const [scheme, setScheme] = useState<File | null>(null);
  const upload = async (f: File) => {
    const path = `${user?.id}/${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("past-papers").upload(path, f);
    if (error) throw error;
    return path;
  };
  const add = async () => {
    if (!form.title || !file) return toast.error("Title and PDF required");
    try {
      const pdf_url = await upload(file);
      const marking_scheme_url = scheme ? await upload(scheme) : null;
      const { error } = await supabase.from("past_papers").insert({ ...form, pdf_url, marking_scheme_url, uploaded_by: user?.id });
      if (error) throw error;
      setForm({ title: "", exam_board: "", level: "", subject: "", year: new Date().getFullYear(), paper_type: "" });
      setFile(null); setScheme(null); toast.success("Uploaded"); reload();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Upload past paper</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Board</Label><Input value={form.exam_board} onChange={(e) => setForm({ ...form, exam_board: e.target.value })} placeholder="Cambridge / Edexcel / FBISE…" /></div>
          <div><Label>Level</Label><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="O Level / A Level / Class 10…" /></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          <div><Label>Paper type</Label><Input value={form.paper_type} onChange={(e) => setForm({ ...form, paper_type: e.target.value })} placeholder="Paper 1 / 2 / Variant 3…" /></div>
          <div><Label>PDF</Label><Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Marking scheme (optional)</Label><Input type="file" accept="application/pdf" onChange={(e) => setScheme(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Upload</Button>
      </Card>
      <div className="space-y-1">
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="No past papers yet" description="Upload one above." />
        ) : rows.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-3 text-sm">
            <span>{p.title} <span className="text-muted-foreground">· {[p.exam_board, p.level, p.subject, p.year].filter(Boolean).join(" · ")}</span></span>
            <Button size="icon" variant="ghost" aria-label="Delete past paper" onClick={() => del("past_papers", p.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ChannelsAdmin() {
  const { rows, loading, error, reload } = useTable("chat_channels");
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", description: "", subject: "", exam_board: "" });
  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("chat_channels").insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    setForm({ name: "", description: "", subject: "", exam_board: "" }); toast.success("Channel created"); reload();
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-semibold">Create channel</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Board</Label><Input value={form.exam_board} onChange={(e) => setForm({ ...form, exam_board: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4" /> Create</Button>
      </Card>
      <div className="space-y-1">
        {loading ? (
          <CardSkeletons count={2} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Hash className="h-6 w-6" />} title="No channels yet" description="Create one above." />
        ) : rows.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-3 text-sm">
            <span>{c.name} <span className="text-muted-foreground">· {[c.subject, c.exam_board].filter(Boolean).join(" · ")}</span></span>
            <Button size="icon" variant="ghost" aria-label="Delete chat channel" onClick={() => del("chat_channels", c.id, reload)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RoleInvitesAdmin() {
  const { user } = useAuth();
  const { rows, loading, error, reload } = useTable("role_invites");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");

  const add = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return toast.error("Enter a valid email address");
    const { error: err } = await supabase.from("role_invites" as any).insert({ email: clean, role, invited_by: user?.id } as any);
    if (err) return toast.error(err.message);
    await logAdminAction(user, "invite_role", "role_invites", clean, { role });
    toast.success(`${clean} will become a ${role.replace("_", "-")} as soon as they sign up`);
    setEmail("");
    reload();
  };

  const remove = async (row: Row) => {
    const { error: err } = await supabase.from("role_invites" as any).delete().eq("id", row.id);
    if (err) return toast.error(err.message);
    await logAdminAction(user, "revoke_role_invite", "role_invites", row.email, { role: row.role });
    reload();
  };

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-4">
        <h2 className="font-display text-base font-semibold">Invite by email — no sign-up needed first</h2>
        <p className="text-xs text-muted-foreground">The role is applied automatically the moment they create their account with this email.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.com" />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select id="invite-role" className="mt-1 block h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="co_admin">Co-admin</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button className="self-end" onClick={add}><Plus className="h-4 w-4" /> Invite</Button>
        </div>
      </Card>

      {loading ? <CardSkeletons count={3} /> : error ? <ErrorState description={error} onRetry={reload} />
        : rows.length === 0 ? <EmptyState title="No role invites yet" description="Invite a teacher or co-admin by email above." />
        : rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{r.email}</p>
              <p className="text-xs text-muted-foreground">
                {r.role} · {r.claimed_at ? `claimed ${new Date(r.claimed_at).toLocaleDateString()}` : "waiting for sign-up"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label={`Remove invite for ${r.email}`}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
    </div>
  );
}

function AuditLogAdmin() {
  const { rows, loading, error, reload } = useTable("admin_audit_log");
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-muted-foreground">Every staff action is recorded here with who did it and when.</p>
      {loading ? <CardSkeletons count={4} /> : error ? <ErrorState description={error} onRetry={reload} />
        : rows.length === 0 ? <EmptyState title="No admin activity yet" description="Actions performed by admins and co-admins will appear here." />
        : rows.map((r) => (
          <Card key={r.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.action.replace(/_/g, " ")} · {r.entity}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              by {r.actor_email ?? r.actor_user_id}{r.entity_id ? ` · ${r.entity_id}` : ""}
            </p>
          </Card>
        ))}
    </div>
  );
}
