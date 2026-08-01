import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [
    { title: "Events — Sasha AI" },
    { name: "description", content: "Upcoming workshops, study sessions and exam events from Sasha AI tutors and the wider student community." },
    { property: "og:title", content: "Events — Sasha AI" },
    { property: "og:description", content: "Workshops, exam-prep sessions and study events you can join inside Sasha AI." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/events" },
  ] }),
  component: EventsPage,
});

function EventsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("events").select("*").order("starts_at", { ascending: true }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Events</h1>
      <p className="mb-6 text-sm text-muted-foreground">Upcoming events, contests, and meetups.</p>
      {rows.length === 0 && <p className="text-muted-foreground">No events yet.</p>}
      <div className="space-y-3">
        {rows.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            {e.image_url && <img src={e.image_url} alt={e.title} className="h-40 w-full object-cover" />}
            <div className="p-4">
              <h2 className="font-display text-lg font-semibold">{e.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.starts_at).toLocaleString()}</span>
                {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
              </p>
              {e.description && <p className="mt-2 text-sm">{e.description}</p>}
              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  More info <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/events" }],mport { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [
    { title: "Events — Sasha AI" },
    { name: "description", content: "Upcoming workshops, study sessions and exam events from Sasha AI tutors and the wider student community." },
    { property: "og:title", content: "Events — Sasha AI" },
    { property: "og:description", content: "Workshops, exam-prep sessions and study events you can join inside Sasha AI." },
    { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/events" },
  ] }),
  component: EventsPage,
});

function EventsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("events").select("*").order("starts_at", { ascending: true }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-semibold">Events</h1>
      <p className="mb-6 text-sm text-muted-foreground">Upcoming events, contests, and meetups.</p>
      {rows.length === 0 && <p className="text-muted-foreground">No events yet.</p>}
      <div className="space-y-3">
        {rows.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            {e.image_url && <img src={e.image_url} alt={e.title} className="h-40 w-full object-cover" />}
            <div className="p-4">
              <h2 className="font-display text-lg font-semibold">{e.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.starts_at).toLocaleString()}</span>
                {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
              </p>
              {e.description && <p className="mt-2 text-sm">{e.description}</p>}
              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  More info <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
