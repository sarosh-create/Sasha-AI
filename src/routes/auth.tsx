import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { toast } from "sonner";

/** Only allow same-origin relative paths as a post-login redirect target. */
function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) ?? undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Sasha AI" },
      { name: "description", content: "Sign in or create a free Sasha AI account to unlock your personalised study plan, AI tutor and exam-style quizzes." },
      { property: "og:title", content: "Sign in — Sasha AI" },
      { property: "og:description", content: "Create a free Sasha AI account and start a personalised, exam-focused study plan in minutes." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/auth" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [teacherSubjects, setTeacherSubjects] = useState("");
  const [teacherQualifications, setTeacherQualifications] = useState("");
  const [teacherMessage, setTeacherMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (accountType === "teacher" && !teacherSubjects.trim()) {
          toast.error("Tell us which subjects you can teach");
          setBusy(false);
          return;
        }
        const redirectUrl = `${window.location.origin}/dashboard`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { name, account_type: accountType } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert(
            {
              user_id: data.user.id,
              display_name: name || email.split("@")[0],
              account_type: accountType,
            } as any,
            { onConflict: "user_id" },
          );
          if (accountType === "teacher") {
            const { error: applicationError } = await supabase.from("teacher_applications" as any).upsert(
              {
                user_id: data.user.id,
                name: name || email.split("@")[0],
                email,
                subjects: teacherSubjects.trim(),
                qualifications: teacherQualifications.trim() || null,
                message: teacherMessage.trim() || null,
                status: "pending",
              },
              { onConflict: "user_id" },
            );
            if (applicationError) throw applicationError;
            toast.success("Teacher application sent for admin review.");
          } else {
            toast.success("Account created. Let's set up your study plan.");
          }
          // Fire-and-forget admin email notification (Resend)
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ email, name, source: accountType }),
          }).catch(() => {});
          nav({ to: "/onboarding" });
        } else {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    nav({ to: "/dashboard" });
  };

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signup" ? "Start studying — it's free" : "Welcome back"}
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup"
              ? "Your AI mentor and personalized study plan are 2 minutes away."
              : "Pick up where you left off."}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign in
          </button>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={google}
          disabled={busy}
          type="button"
        >
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
              </div>
              <div>
                <Label>Account type</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button type="button" variant={accountType === "student" ? "default" : "outline"} onClick={() => setAccountType("student")}>Student</Button>
                  <Button type="button" variant={accountType === "teacher" ? "default" : "outline"} onClick={() => setAccountType("teacher")}>Teacher</Button>
                </div>
              </div>
              {accountType === "teacher" && (
                <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                  <div>
                    <Label htmlFor="teacher-subjects">Subjects you teach</Label>
                    <Input id="teacher-subjects" required value={teacherSubjects} onChange={(e) => setTeacherSubjects(e.target.value)} placeholder="Maths, Physics, O Level Chemistry" />
                  </div>
                  <div>
                    <Label htmlFor="teacher-qualifications">Qualifications / experience</Label>
                    <Textarea id="teacher-qualifications" value={teacherQualifications} onChange={(e) => setTeacherQualifications(e.target.value)} placeholder="Your teaching experience, boards, or certificates" />
                  </div>
                  <div>
                    <Label htmlFor="teacher-message">Message for admin</Label>
                    <Textarea id="teacher-message" value={teacherMessage} onChange={(e) => setTeacherMessage(e.target.value)} placeholder="Availability, rates, class types, etc." />
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" type="submit" disabled={busy}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setMode((current) => (current === "signup" ? "signin" : "signup"))}
            className="font-medium text-accent-foreground underline-offset-4 hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
