import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type A11yMode = "default" | "deuteranopia" | "protanopia" | "tritanopia" | "high-contrast";
export const A11Y_MODES: { id: A11yMode; label: string; hint: string }[] = [
  { id: "default", label: "Default", hint: "Full Playful Pop palette" },
  { id: "deuteranopia", label: "Deuteranopia (red-green)", hint: "Blue & orange swaps" },
  { id: "protanopia", label: "Protanopia (red-green)", hint: "Cool palette swap" },
  { id: "tritanopia", label: "Tritanopia (blue-yellow)", hint: "Red/pink/teal swap" },
  { id: "high-contrast", label: "High contrast", hint: "Maximum legibility" },
];

const Ctx = createContext<{ mode: A11yMode; setMode: (m: A11yMode) => void }>({
  mode: "default",
  setMode: () => {},
});

const STORAGE_KEY = "a11y_mode";

export function A11yProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<A11yMode>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (window.localStorage.getItem(STORAGE_KEY) as A11yMode | null) ?? "default";
    setModeState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-a11y", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("a11y_mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.a11y_mode && data.a11y_mode !== mode) {
          setModeState(data.a11y_mode as A11yMode);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setMode = (m: A11yMode) => {
    setModeState(m);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, m);
    if (user) {
      supabase.from("profiles").update({ a11y_mode: m } as any).eq("user_id", user.id);
    }
  };

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export const useA11y = () => useContext(Ctx);
