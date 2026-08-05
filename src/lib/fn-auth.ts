import { supabase } from "@/integrations/supabase/client";

/**
 * Auth headers for edge-function calls. AI functions require a real user
 * session — the publishable key alone is rejected server-side.
 */
export async function aiHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const SIGN_IN_REQUIRED = "Please sign in to use the AI tools — it's free.";
