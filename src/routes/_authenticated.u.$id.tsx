import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading, EmptyState } from "@/components/ui/states";
import { Flame, Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/u/$id")({
  head: () => ({
    meta: [
      { title: "Student profile — Sasha AI" },
      { name: "description", content: "View a Sasha AI learner's profile: their bio, mood, XP and study streak." },
      { property: "og:title", content: "Student profile — Sasha AI" },
      { property: "og:description", content: "View a Sasha AI learner's bio, mood, XP and study streak." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type P = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: string | null;
  status_emoji: string | null;
  xp: number;
  level: number;
  streak_count: number;
  exam_board: string | null;
};

function ProfilePage() {
  const { id } = Route.useParams();
  const [p, setP] = useState<P | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.rpc("get_public_profile" as any, { _user: id }).then(({ data }: any) => {
      setP((data ?? [])[0] ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <PageLoading label="Loading profile…" />;
  if (!p) return <EmptyState title="Profile not available" description="This learner keeps their profile private." />;

  return (
    <div className="bg-aurora min-h-[calc(100vh-3rem)] p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to leaderboard
        </Link>
        <div className="rounded-3xl border bg-card p-6 shadow-pop">
          <div className="flex items-center gap-4">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={`${p.display_name ?? "Learner"}'s profile picture`} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-secondary font-display text-2xl font-bold">
                {(p.display_name ?? "F").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">{p.display_name ?? "Falcon"}</h1>
              {p.status && (
                <p className="text-sm text-muted-foreground">
                  {p.status_emoji} {p.status}
                </p>
              )}
              {p.exam_board && <p className="text-xs text-muted-foreground">{p.exam_board}</p>}
            </div>
          </div>

          {p.bio && <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{p.bio}</p>}

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border bg-background p-3">
              <div className="font-display text-xl font-bold text-primary">{p.xp}</div>
              <div className="text-xs text-muted-foreground"><Zap className="mr-1 inline h-3 w-3" />XP</div>
            </div>
            <div className="rounded-2xl border bg-background p-3">
              <div className="font-display text-xl font-bold text-primary">{p.level}</div>
              <div className="text-xs text-muted-foreground">Level</div>
            </div>
            <div className="rounded-2xl border bg-background p-3">
              <div className="font-display text-xl font-bold text-primary">{p.streak_count}</div>
              <div className="text-xs text-muted-foreground"><Flame className="mr-1 inline h-3 w-3" />Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
