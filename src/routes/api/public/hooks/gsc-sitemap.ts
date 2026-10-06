/**
 * Weekly: resubmit the sitemap to Google Search Console and record the index
 * status of the key pages. Called by pg_cron; protected by CRON_SECRET.
 */
import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://sashaai.lovable.app/";
const SITEMAP = "https://sashaai.lovable.app/sitemap.xml";
const KEY_PAGES = ["", "homework-helper", "paper-checker", "essay-grader", "math-solver"];
const GW = "https://connector-gateway.lovable.dev/google_search_console";

export const Route = createFileRoute("/api/public/hooks/gsc-sitemap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authorizeCron } = await import("@/lib/emails.server");
        if (!authorizeCron(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
        const lk = process.env["LOVABLE_API_KEY"];
        const ck = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
        if (!lk || !ck) return Response.json({ error: "Search Console not connected" }, { status: 500 });
        const headers = { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck };

        // Only act on a property Google says this account has verified.
        const sres = await fetch(`${GW}/webmasters/v3/sites`, { headers });
        if (!sres.ok) return Response.json({ error: `sites ${sres.status}: ${await sres.text()}` }, { status: 502 });
        const { siteEntry = [] } = (await sres.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
        const prop = siteEntry.find((s) => s.siteUrl === SITE && s.permissionLevel !== "siteUnverifiedUser");
        if (!prop) return Response.json({ error: "property not verified" }, { status: 409 });

        const enc = encodeURIComponent;
        const sub = await fetch(`${GW}/webmasters/v3/sites/${enc(prop.siteUrl)}/sitemaps/${enc(SITEMAP)}`, { method: "PUT", headers });

        const pages: Record<string, string> = {};
        for (const p of KEY_PAGES) {
          const r = await fetch(`${GW}/v1/urlInspection/index:inspect`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: SITE + p, siteUrl: prop.siteUrl }),
          });
          if (r.status === 429 || r.status === 403) { pages["/" + p] = `stopped (${r.status})`; break; }
          const j = r.ok ? await r.json() : null;
          pages["/" + p] = j?.inspectionResult?.indexStatusResult?.coverageState ?? `error ${r.status}`;
        }
        console.log("gsc-sitemap", sub.status, pages);
        return Response.json({ sitemapSubmitted: sub.status === 204 || sub.ok, pages });
      },
    },
  },
});
