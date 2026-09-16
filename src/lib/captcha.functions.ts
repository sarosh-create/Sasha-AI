import { createServerFn } from "@tanstack/react-start";

/** Public site key for the sign-up form (safe to expose). */
export const getCaptchaSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  return { siteKey: process.env["RECAPTCHA_SITE_KEY"] ?? "" };
});

/**
 * Verifies a reCAPTCHA v3 token with Google. When no secret is configured the
 * check is skipped so sign-up keeps working.
 */
export const verifyCaptcha = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; action?: string }) => ({
    token: String(input?.token ?? "").slice(0, 4000),
    action: String(input?.action ?? "signup").slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const secret = process.env["RECAPTCHA_SECRET_KEY"];
    if (!secret) return { ok: true, skipped: true, score: null as number | null };
    // If Google's script never loaded (blocked, offline, unregistered host) we
    // must not lock a real student out of signing up.
    if (!data.token) return { ok: true, skipped: true, score: null as number | null };

    try {
      const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: data.token }),
      });
      const body = (await res.json()) as { success?: boolean; score?: number; action?: string };
      const score = typeof body.score === "number" ? body.score : null;
      const ok = Boolean(body.success) && (score === null || score >= 0.5);
      return { ok, skipped: false, score };
    } catch {
      // Never lock people out because Google is unreachable.
      return { ok: true, skipped: true, score: null as number | null };
    }
  });
