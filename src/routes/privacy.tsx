import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sasha AI" },
      { name: "description", content: "How Sasha AI collects, uses and protects your data, including study progress, photos you upload and account details." },
      { property: "og:title", content: "Privacy Policy — Sasha AI" },
      { property: "og:description", content: "How Sasha AI collects, uses and protects student data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/privacy" }],
  }),
  component: Privacy,
});

const SECTIONS: { h: string; p: string[] }[] = [
  { h: "Who we are", p: ["Sasha AI is an AI study mentor for students. Contact: tsr4sg@gmail.com."] },
  { h: "What we collect", p: [
    "Account details: your name, email address, account type (student or teacher) and password (stored encrypted).",
    "Profile details you choose to add: profile picture, bio, status, exam board, subjects and exam date.",
    "Study activity: quizzes, study path progress, notes, marked papers and essays, mistakes and XP.",
    "Photos and text you upload for marking. These are sent to our AI provider only to produce your feedback.",
    "Basic sign-in records: time of sign-in and sign-out and your device's browser type, used for account security.",
  ] },
  { h: "How we use it", p: [
    "To run the app: build your study plan, mark your answers and track your progress.",
    "To send study reminders and weekly progress emails. You can turn these off in Settings.",
    "To keep accounts safe and stop abuse, including Google reCAPTCHA on sign-up.",
    "We do not sell your data and we do not show ads.",
  ] },
  { h: "Who can see it", p: [
    "Other students see only your public profile (name, picture, bio, status, XP) if you appear on the leaderboard.",
    "Teachers you are assigned to can see your study progress. Site admins can see account details to run the service.",
    "Service providers that process data for us: our hosting and database provider, our AI model provider, our email provider and Google (sign-in and reCAPTCHA).",
  ] },
  { h: "Children", p: ["Sasha AI is meant for students aged 13 and over. If you are younger, please use it with a parent or guardian's permission."] },
  { h: "Your choices", p: [
    "You can edit your profile and turn off emails at any time in Settings.",
    "To delete your account and all your data, email tsr4sg@gmail.com from your account's email address. We delete it within 30 days.",
  ] },
  { h: "Security and storage", p: ["Data is sent over encrypted connections and protected with per-user access rules. We keep it while your account is active."] },
  { h: "Changes", p: ["If we change this policy, we will update the date below. Last updated: 8 October 2026."] },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="container mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-4xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated 8 October 2026</p>
        {SECTIONS.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              {s.p.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
