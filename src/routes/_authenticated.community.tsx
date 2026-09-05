import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [
    { title: "Community — Sasha AI" },
    { name: "description", content: "Discuss topics, share notes and ask questions with other Sasha AI students across exam boards and subjects." },
    { property: "og:title", content: "Community — Sasha AI" },
    { property: "og:description", content: "Talk to other students, share notes and get help in the Sasha AI community channels." },
    { property: "og:url", content: "https://sashaai.lovable.app/community" },
  ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/community" }] }),
  component: CommunityIndex,
});

function CommunityIndex() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from("chat_channels").select("*").order("created_at", { ascending: false });
    if (err) setError(err.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-semibold">Community</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ask questions. Teachers and admins answer. Rate the best replies.</p>
      <div className="mt-6">
        {loading ? (
          <CardSkeletons count={3} className="sm:grid-cols-1 lg:grid-cols-1" />
        ) : error ? (
          <ErrorState description={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No channels yet"
            description="An admin can create one in the Admin panel."
          />
        ) : (
          <div className="grid gap-3">
            {rows.map((c) => (
              <Link key={c.id} to="/community/$id" params={{ id: c.id }}>
                <Card className="flex items-center gap-3 p-4 transition hover:bg-muted/40">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{[c.subject, c.exam_board].filter(Boolean).join(" · ") || "General"}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
