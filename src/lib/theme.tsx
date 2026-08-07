import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId =
  | "falcon"
  | "midnight"
  | "ocean"
  | "forest"
  | "sunset"
  | "rose"
  | "grape"
  | "sand"
  | "cyber"
  | "mono";

export const THEMES: { id: ThemeId; label: string; swatch: string; hint: string }[] = [
  { id: "falcon", label: "Falcon Gold", swatch: "#c9922f", hint: "The signature navy & gold" },
  { id: "midnight", label: "Midnight Blue", swatch: "#3d5afe", hint: "Calm, focused, late-night" },
  { id: "ocean", label: "Ocean", swatch: "#0891b2", hint: "Cool teal and sea spray" },
  { id: "forest", label: "Forest", swatch: "#16a34a", hint: "Green, grounded, restful" },
  { id: "sunset", label: "Sunset", swatch: "#f97316", hint: "Warm orange energy" },
  { id: "rose", label: "Rose", swatch: "#e11d48", hint: "Soft pink and berry" },
  { id: "grape", label: "Grape", swatch: "#7c3aed", hint: "Deep violet focus" },
  { id: "sand", label: "Sand", swatch: "#a16207", hint: "Warm paper and ink" },
  { id: "cyber", label: "Cyber Lime", swatch: "#65a30d", hint: "High-energy neon" },
  { id: "mono", label: "Mono", swatch: "#404040", hint: "Distraction-free greyscale" },
];

type Ctx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
};

const ThemeCtx = createContext<Ctx>({ theme: "falcon", setTheme: () => {}, dark: false, setDark: () => {} });

const THEME_KEY = "sasha:theme";
const DARK_KEY = "sasha:dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("falcon");
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.localStorage.getItem(THEME_KEY) as ThemeId | null;
    if (t) setThemeState(t);
    const d = window.localStorage.getItem(DARK_KEY);
    setDarkState(d === null ? window.matchMedia("(prefers-color-scheme: dark)").matches : d === "1");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", dark);
  }, [theme, dark]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, t);
  };
  const setDark = (d: boolean) => {
    setDarkState(d);
    if (typeof window !== "undefined") window.localStorage.setItem(DARK_KEY, d ? "1" : "0");
  };

  return <ThemeCtx.Provider value={{ theme, setTheme, dark, setDark }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
