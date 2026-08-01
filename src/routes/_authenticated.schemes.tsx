import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/schemes")({
  head: () => ({ meta: [
    { title: "Schemes — Sasha AI" },
    { name: "description", content: "Browse schemes of work and curriculum outlines for your exam board, mapped to Sasha AI lessons and quizzes." },
    { property: "og:title", content: "Schemes — Sasha AI" },
    { property: "og:description", content: "Curriculum outlines and schemes of work mapped to lessons inside Sasha AI." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/schemes" },
  ] }),
  component: SchemesPage,
});

function SchemesPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("schemes").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Schemes</h1>
      <p className="mb-6 text-sm text-muted-foreground">Curated study schemes and learning paths.</p>
      {rows.length === 0 && <p className="text-muted-foreground">No schemes yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            {s.image_url && <img src={s.image_url} alt={s.title} className="h-32 w-full object-cover" />}
            <div className="p-4">
              <h2 className="font-display font-semibold">{s.title}</h2>
              {s.subject && <p className="text-xs text-muted-foreground">{s.subject}</p>}
              {s.description && <p className="mt-2 text-sm">{s.description}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/schemes")({
  head: () => ({ meta: [
    { title: "Schemes — Sasha AI" },
    { name: "description", content: "Browse schemes of work and curriculum outlines for your exam board, mapped to Sasha AI lessons and quizzes." },
    { property: "og:title", content: "Schemes — Sasha AI" },
    { property: "og:description", content: "Curriculum outlines and schemes of work mapped to lessons inside Sasha AI." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/schemes" },
  ] }),
  component: SchemesPage,
});

function SchemesPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("schemes").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Schemes</h1>
      <p className="mb-6 text-sm text-muted-foreground">Curated study schemes and learning paths.</p>
      {rows.length === 0 && <p className="text-muted-foreground">No schemes yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            {s.image_url && <img src={s.image_url} alt={s.title} className="h-32 w-full object-cover" />}
            <div className="p-4">
              <h2 className="font-display font-semibold">{s.title}</h2>
              {s.subject && <p className="text-xs text-muted-foreground">{s.subject}</p>}
              {s.description && <p className="mt-2 text-sm">{s.description}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
