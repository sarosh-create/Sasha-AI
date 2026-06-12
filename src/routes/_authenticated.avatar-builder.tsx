import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Save, Wand2, Palette, Smile } from "lucide-react";

export const Route = createFileRoute("/_authenticated/avatar-builder")({
  head: () => ({
    meta: [
      { title: "Avatar Builder — design your study buddy | Sasha AI" },
      { name: "description", content: "Design your own talking AI study avatar — pick a creature, color, accessory and aura, or generate a unique one with AI." },
      { property: "og:title", content: "Avatar Builder — design your study buddy" },
      { property: "og:description", content: "Pick a creature, color, accessory and aura, or AI-generate a unique avatar for your study sessions." },
      { property: "og:url", content: "https://study-mentor-by-sarosh-ai.lovable.app/avatar-builder" },
      { name: "twitter:title", content: "Avatar Builder — design your study buddy" },
      { name: "twitter:description", content: "Pick a creature, color, accessory and aura, or AI-generate a unique avatar." },
    ],
    links: [{ rel: "canonical", href: "https://study-mentor-by-sarosh-ai.lovable.app/avatar-builder" }],
  }),
  component: AvatarBuilder,
});

export type AvatarConfig = {
  mode: "emoji" | "ai";
  emoji: string;
  name: string;
  bgColor: string;
  auraColor: string;
  glow: number;        // 0–100
  accessory: "none" | "crown" | "halo" | "glasses" | "hat" | "headphones" | "bow" | "star";
  generatedImage?: string; // data URL or http
};

const DEFAULT: AvatarConfig = {
  mode: "emoji",
  emoji: "🦊",
  name: "Buddy",
  bgColor: "#1e293b",
  auraColor: "#fbbf24",
  glow: 60,
  accessory: "none",
};

const EMOJIS = ["🦊","🦉","🐉","🐢","🐙","🦄","🐺","🐱","🐧","🦋","🐝","🐳","🌙","⭐","🪐","🧚","🧙","🐲","🦔","🐰","🐼","🦝","🦅","🐢","👽","🤖","🐸","🦖"];
const ACCESSORIES: { id: AvatarConfig["accessory"]; label: string; glyph: string }[] = [
  { id: "none", label: "None", glyph: "—" },
  { id: "crown", label: "Crown", glyph: "👑" },
  { id: "halo", label: "Halo", glyph: "😇" },
  { id: "glasses", label: "Glasses", glyph: "🕶️" },
  { id: "hat", label: "Hat", glyph: "🎩" },
  { id: "headphones", label: "Headphones", glyph: "🎧" },
  { id: "bow", label: "Bow", glyph: "🎀" },
  { id: "star", label: "Star", glyph: "🌟" },
];

const STORAGE_KEY = "sasha:avatar";

export function readAvatar(): AvatarConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}
function saveLocal(a: AvatarConfig) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch {} }

function AvatarBuilder() {
  const { user, session } = useAuth();
  const [a, setA] = useState<AvatarConfig>(DEFAULT);
  const [prompt, setPrompt] = useState("a wise cosmic owl with golden eyes, soft glow");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setA(readAvatar()); }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_config").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.avatar_config) { const merged = { ...DEFAULT, ...(data.avatar_config as any) }; setA(merged); saveLocal(merged); } });
  }, [user]);

  const update = (patch: Partial<AvatarConfig>) => { const n = { ...a, ...patch }; setA(n); saveLocal(n); };

  const generateAI = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Generation failed");
      const j = await res.json();
      if (!j.image) throw new Error("No image returned");
      update({ mode: "ai", generatedImage: j.image });
      toast.success("Avatar generated!");
    } catch (e: any) {
      toast.error(e.message || "Couldn't generate");
    } finally { setGenerating(false); }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ avatar_config: a as any }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Avatar saved to your profile");
  };

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3" /> Design your study companion
        </div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Avatar Builder</h1>
        <p className="mt-1 text-muted-foreground">Make a unique avatar that follows you across Study Buddy, Falcon and the dashboard.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <AvatarPreview config={a} />

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Tabs defaultValue="emoji">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emoji" onClick={() => update({ mode: "emoji" })}><Smile className="mr-1 h-4 w-4" /> Emoji + style</TabsTrigger>
              <TabsTrigger value="ai" onClick={() => update({ mode: "ai" })}><Wand2 className="mr-1 h-4 w-4" /> AI-generated</TabsTrigger>
            </TabsList>

            <TabsContent value="emoji" className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Name</label>
                <Input value={a.name} maxLength={40} onChange={(e) => update({ name: e.target.value })} />
              </div>
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creature</h2>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => update({ emoji: e })}
                      aria-label={`Pick ${e}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition ${a.emoji === e ? "border-2 border-primary bg-primary/10" : "border border-border hover:bg-accent"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accessory</h2>
                <div className="flex flex-wrap gap-2">
                  {ACCESSORIES.map((acc) => (
                    <button key={acc.id} onClick={() => update({ accessory: acc.id })}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${a.accessory === acc.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                      <span>{acc.glyph}</span>{acc.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField label="Background" value={a.bgColor} onChange={(v) => update({ bgColor: v })} />
                <ColorField label="Aura / glow" value={a.auraColor} onChange={(v) => update({ auraColor: v })} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Aura intensity · {a.glow}%</p>
                <Slider value={[a.glow]} min={0} max={100} step={5} onValueChange={(v) => update({ glow: v[0] })} />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Describe your avatar</h2>
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="a magical fox with star fur, glowing eyes…" />
              <div className="flex items-center gap-2">
                <Button onClick={generateAI} disabled={generating}>
                  <Wand2 className="mr-2 h-4 w-4" /> {generating ? "Conjuring…" : "Generate avatar"}
                </Button>
                <span className="text-xs text-muted-foreground">Powered by Lovable AI</span>
              </div>
              {a.generatedImage && (
                <p className="text-xs text-muted-foreground">Generated image is being used. Switch back to Emoji tab anytime.</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setA(DEFAULT); saveLocal(DEFAULT); }}>Reset</Button>
            <Button onClick={save} disabled={saving || !user}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save to profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background p-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-9 w-12 cursor-pointer rounded" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="border-0 shadow-none" />
      </div>
    </div>
  );
}

export function AvatarPreview({ config, size = 220 }: { config: AvatarConfig; size?: number }) {
  const acc = useMemo(() => ACCESSORIES.find((x) => x.id === config.accessory), [config.accessory]);
  const glowPx = Math.round((config.glow / 100) * 60);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col items-center">
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            background: config.bgColor,
            boxShadow: `0 0 ${glowPx}px ${config.auraColor}, inset 0 0 ${Math.round(glowPx / 2)}px ${config.auraColor}55`,
          }}
        >
          {config.mode === "ai" && config.generatedImage ? (
            <img src={config.generatedImage} alt={config.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span style={{ fontSize: size * 0.55, lineHeight: 1 }} aria-label={config.name}>{config.emoji}</span>
          )}
          {acc && acc.id !== "none" && (
            <span className="absolute -top-3 text-3xl drop-shadow-lg" aria-hidden>{acc.glyph}</span>
          )}
        </div>
        <p className="mt-4 text-center font-display text-lg font-semibold text-foreground">{config.name}</p>
        <p className="text-center text-xs text-muted-foreground">Your study companion</p>
      </div>
    </div>
  );
}
