import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, LineChart as LineChartIcon, ScrollText, ShieldCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/ui/states";
import { fetchMastery, overallMastery, LEVEL_LABEL, type TopicMastery } from "@/lib/mastery";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
  head: () => ({
    meta: [
      { title: "Progress & Mastery — Sasha AI" },
      { name: "description", content: "See your mastery curve per topic, backed by strictly marked exam-style questions — proof you are actually improving." },
      { property: "og:title", content: "Progress & Mastery — Sasha AI" },
      { property: "og:description", content: "A mastery curve per topic, backed by strict marking. Proof of improvement you can show a parent." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/progress" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/progress" }],
  }),
});

const LEVEL_CLASS: Record<TopicMastery["level"], string> = {
  mastered: "bg-success text-success-foreground",
  solid: "bg-primary text-primary-foreground",
  building: "bg-warning text-warning-foreground",
  shaky: "bg-destructive text-destructive-foreground",
};

function ProgressPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicMastery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setTopics(null);
    setError(null);
    fetchMastery(user.id)
      .then((t) => !cancelled && setTopics(t))
      .catch((e) => !cancelled && setError(e?.message ?? "Could not load your marking history."));
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const summary = overallMastery(topics ?? []);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Progress &amp; Mastery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every curve below comes from strictly marked exam-style questions. Screenshot it — it's proof, not vibes.
          </p>
        </div>
        <Link to="/quiz/new" search={{} as never}>
          <Button size="sm">
            <ScrollText className="h-4 w-4" /> New quiz
          </Button>
        </Link>
      </header>

      {error ? (
        <ErrorState className="mt-8" description={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : topics === null ? (
        <CardSkeletons className="mt-8" count={3} />
      ) : topics.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<LineChartIcon className="h-5 w-5" />}
          title="No mastery data yet"
          description="Finish one marked quiz and your first datapoint lands here. Two attempts on a topic and you get a curve."
          action={
            <Link to="/quiz/new" search={{} as never}>
              <Button size="sm">Take your first quiz</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Shareable proof card */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall mastery</p>
                <p className="mt-1 font-display text-3xl font-semibold">{summary.mastery}%</p>
                <Progress value={summary.mastery} className="mt-3" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Change since first attempt</p>
                <p className="mt-1 flex items-center gap-1 font-display text-3xl font-semibold">
                  {summary.delta > 0 ? "+" : ""}
                  {summary.delta}%
                  {summary.delta > 0 ? <TrendingUp className="h-5 w-5 text-success" /> : null}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {summary.improvedTopics} topic{summary.improvedTopics === 1 ? "" : "s"} improved
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Questions marked</p>
                <p className="mt-1 font-display text-3xl font-semibold">{summary.questionsMarked}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Strict exam marking
                </p>
              </div>
            </div>
          </section>

          <div className="mt-6 space-y-4">
            {topics.map((t) => (
              <TopicCard key={t.topic} topic={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopicCard({ topic }: { topic: TopicMastery }) {
  const data = topic.attempts.map((a, i) => ({
    attempt: `#${i + 1}`,
    pct: a.pct,
    date: new Date(a.at).toLocaleDateString(),
  }));

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{topic.topic}</h2>
          <p className="text-xs text-muted-foreground">
            {topic.attempts.length} attempt{topic.attempts.length === 1 ? "" : "s"} · {topic.questionsMarked} questions marked · best {topic.best}%
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {topic.attempts.length > 1 && (
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className={`h-3 w-3 ${topic.delta < 0 ? "rotate-90" : ""}`} />
              {topic.delta > 0 ? "+" : ""}
              {topic.delta}%
            </Badge>
          )}
          <Badge className={LEVEL_CLASS[topic.level]}>{LEVEL_LABEL[topic.level]} · {topic.mastery}%</Badge>
        </div>
      </div>

      <div className="mt-4 h-36 w-full">
        {topic.attempts.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
              <XAxis dataKey="attempt" tickLine={false} axisLine={false} fontSize={11} stroke="currentColor" opacity={0.5} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="currentColor" opacity={0.5} />
              <ReTooltip
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, "Score"]}
                labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.date ?? ""}`}
              />
              <Line type="monotone" dataKey="pct" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            One attempt so far ({topic.latest}%). Take this topic again to draw the curve.
          </div>
        )}
      </div>
    </article>
  );
}
