import { useEffect, useRef, useState } from "react";
import { getCaptchaSiteKey } from "@/lib/captcha.functions";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Loads Google reCAPTCHA v3 once and returns a helper that mints a token.
 * If no site key is configured the helper resolves to an empty string and the
 * server-side check treats it as "not enabled".
 */
export function useCaptcha() {
  const [siteKey, setSiteKey] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getCaptchaSiteKey()
      .then((r) => {
        if (!cancelled) setSiteKey(r.siteKey);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!siteKey || loaded.current) return;
    loaded.current = true;
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  const getToken = async (action: string): Promise<string> => {
    if (!siteKey || !window.grecaptcha) return "";
    try {
      await new Promise<void>((resolve) => window.grecaptcha!.ready(() => resolve()));
      return await window.grecaptcha!.execute(siteKey, { action });
    } catch {
      return "";
    }
  };

  return { enabled: Boolean(siteKey), getToken };
}
