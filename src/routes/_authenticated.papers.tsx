import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { PageLoading, ErrorState, EmptyState } from "@/components/ui/states";

export const Route = createFileRoute("/_authenticated/papers")({
  head: () => ({ meta: [
    { title: "Past Papers — Sasha AI" },
    { name: "description", content: "Search and download past exam papers and mark schemes across Matric, GCSE, IGCSE and A Level boards inside Sasha AI." },
    { property: "og:title", content: "Past Papers — Sasha AI" },
    { property: "og:description", content: "Past papers and mark schemes for Matric, GCSE, IGCSE and A Level, all in one place." },
    { property: "og:url", content: "https://sashaai.lovable.app/papers" },
  ],
    links: [{ rel: "canonical", href: "https://sashaai.lovable.app/papers" }] }),
  component: PapersPage,
});

function PapersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    supabase.from("past_papers").select("*").order("year", { ascending: false }).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setRows(data ?? []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.title, r.subject, r.exam_board, r.level, String(r.year)].some((v) => v?.toLowerCase?.().includes(s));
  });

  const sign = async (url: string) => {
    if (url.startsWith("http")) return url;
    const { data } = await supabase.storage.from("past-papers").createSignedUrl(url, 3600);
    return data?.signedUrl ?? "#";
  };
  const open = async (url: string) => { const u = await sign(url); window.open(u, "_blank"); };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Past papers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Browse and download exam papers and marking schemes.</p>
      <Input className="mt-4" placeholder="Search by subject, board, year…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <PageLoading className="px-0 py-6" label="Loading past papers…" />
      ) : error ? (
        <ErrorState className="mt-6" description={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<FileText className="h-6 w-6" />}
          title="No papers yet"
          description="Your admin will upload past papers soon."
        />
      ) : (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[p.exam_board, p.level, p.subject, p.year, p.paper_type].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => open(p.pdf_url)}><Download className="mr-1 h-4 w-4" /> Paper</Button>
              {p.marking_scheme_url && <Button size="sm" variant="outline" onClick={() => open(p.marking_scheme_url)}>Marking scheme</Button>}
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
