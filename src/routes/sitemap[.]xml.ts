import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://study-mentor-by-sarosh-ai.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
          { path: "/homework-helper", changefreq: "weekly", priority: "0.9" },
          { path: "/math-solver", changefreq: "weekly", priority: "0.9" },
          { path: "/rate", changefreq: "monthly", priority: "0.6" },
          { path: "/dashboard", changefreq: "weekly", priority: "0.8" },
          { path: "/achievements", changefreq: "weekly", priority: "0.6" },
          { path: "/classes", changefreq: "weekly", priority: "0.6" },
          { path: "/community", changefreq: "daily", priority: "0.7" },
          { path: "/converter", changefreq: "monthly", priority: "0.5" },
          { path: "/events", changefreq: "weekly", priority: "0.6" },
          { path: "/examiner", changefreq: "weekly", priority: "0.7" },
          { path: "/explainers", changefreq: "weekly", priority: "0.7" },
          { path: "/explainers/library", changefreq: "weekly", priority: "0.7" },
          
          { path: "/lab", changefreq: "weekly", priority: "0.7" },
          { path: "/leaderboard", changefreq: "daily", priority: "0.6" },
          { path: "/mentors", changefreq: "weekly", priority: "0.6" },
          { path: "/notes", changefreq: "weekly", priority: "0.6" },
          { path: "/onboarding", changefreq: "monthly", priority: "0.5" },
          { path: "/papers", changefreq: "weekly", priority: "0.7" },
          { path: "/path", changefreq: "weekly", priority: "0.7" },
          { path: "/predictions", changefreq: "weekly", priority: "0.6" },
          { path: "/quiz", changefreq: "weekly", priority: "0.7" },
          { path: "/quiz/new", changefreq: "weekly", priority: "0.6" },
          { path: "/revision", changefreq: "weekly", priority: "0.7" },
          { path: "/rooms", changefreq: "weekly", priority: "0.6" },
          { path: "/schemes", changefreq: "weekly", priority: "0.6" },
          { path: "/settings", changefreq: "monthly", priority: "0.5" },
          { path: "/study-buddy", changefreq: "weekly", priority: "0.7" },
          { path: "/teach", changefreq: "weekly", priority: "0.7" },
          { path: "/teacher", changefreq: "weekly", priority: "0.7" },
          { path: "/tutor", changefreq: "weekly", priority: "0.8" },
        ];
        // Dynamic routes: community channels and public study rooms are
        // shareable, so one entry per real row. /lesson/$id is intentionally
        // excluded: lesson rows belong to a single student and are never public.
        try {
          // Server-only, id-only projection: rows are RLS-protected for app
          // reads, but their URLs are shareable and need to be crawlable.
          const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
          const [{ data: channels }, { data: rooms }] = await Promise.all([
            sb.from("chat_channels").select("id").limit(1000),
            sb.from("study_rooms").select("id").eq("is_public", true).limit(1000),
          ]);
          (channels ?? []).forEach((c: { id: string }) =>
            entries.push({ path: `/community/${c.id}`, changefreq: "daily", priority: "0.5" }),
          );
          (rooms ?? []).forEach((r: { id: string }) =>
            entries.push({ path: `/rooms/${r.id}`, changefreq: "daily", priority: "0.4" }),
          );
        } catch {
          // Sitemap must still render if the database is unreachable.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
