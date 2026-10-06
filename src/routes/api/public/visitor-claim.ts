/**
 * When a visitor signs in, link their pre-signup chat questions to their account
 * and reward curiosity: 2 XP per question (max 20) + "Curious Falcon" badge at 3+.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ visitorId: z.string().min(6).max(64) });

export const Route = createFileRoute("/api/public/visitor-claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const ures = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: key } });
        if (!ures.ok) return Response.json({ error: "unauthorized" }, { status: 401 });
        const user = await ures.json();
        if (!user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });

        let parsed;
        try { parsed = Body.parse(await request.json()); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

        const { adminClient } = await import("@/lib/emails.server");
        const admin = adminClient();
        const { data: rows } = await admin
          .from("visitor_questions")
          .select("id")
          .eq("visitor_id", parsed.visitorId)
          .is("claimed_by", null);
        const n = rows?.length ?? 0;
        if (n === 0) return Response.json({ claimed: 0, xp: 0 });

        await admin.from("visitor_questions").update({ claimed_by: user.id }).eq("visitor_id", parsed.visitorId).is("claimed_by", null);
        const xp = Math.min(20, n * 2);
        const { data: prof } = await admin.from("profiles").select("xp, xp_week").eq("user_id", user.id).maybeSingle();
        if (prof) {
          await admin.from("profiles").update({ xp: (prof.xp ?? 0) + xp, xp_week: (prof.xp_week ?? 0) + xp }).eq("user_id", user.id);
        }
        const { count } = await admin.from("visitor_questions").select("id", { count: "exact", head: true }).eq("claimed_by", user.id);
        let badge = false;
        if ((count ?? 0) >= 3) {
          const { data: has } = await admin.from("achievements").select("id").eq("user_id", user.id).eq("code", "curious_falcon").maybeSingle();
          if (!has) { await admin.from("achievements").insert({ user_id: user.id, code: "curious_falcon" }); badge = true; }
        }
        return Response.json({ claimed: n, xp, badge });
      },
    },
  },
});
