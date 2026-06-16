import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollAvatar, DEFAULT_DOLL, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, BG_COLORS,
  type DollConfig, type DollGender, type DollExpression, type DollHair,
  type DollBody, type DollOutfit, type DollAccessory,
} from "@/components/doll-avatar";

export const Route = createFileRoute("/_authenticated/doll-builder")({
  component: DollBuilder,
  head: () => ({
    meta: [
      { title: "Doll Builder — design your study buddy" },
      { name: "description", content: "Design your own study doll: gender, skin tone, hair, expression, outfit, body shape, and accessories." },
    ],
  }),
});

const GENDERS: DollGender[] = ["male", "female", "neutral"];
const HAIRS: DollHair[] = ["short", "buzz", "wavy", "long", "ponytail", "bun", "curly", "bald", "hijab", "mohawk"];
const EXPRS: DollExpression[] = ["happy", "smirk", "focused", "sleepy", "surprised", "wink"];
const BODIES: DollBody[] = ["slim", "regular", "athletic", "round"];
const OUTFITS: DollOutfit[] = ["tshirt", "hoodie", "uniform", "dress", "blazer", "tank"];
const ACCS: DollAccessory[] = ["none", "glasses", "shades", "earring", "headphones", "cap", "crown"];

function DollBuilder() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<DollConfig>(DEFAULT_DOLL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_config").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_config && typeof data.avatar_config === "object") {
          setCfg({ ...DEFAULT_DOLL, ...(data.avatar_config as Partial<DollConfig>) });
        }
        setLoading(false);
      });
  }, [user]);

  const set = <K extends keyof DollConfig>(k: K, v: DollConfig[K]) => setCfg((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ avatar_config: cfg as never }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Doll saved!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-semibold">Design your study doll</h1>
          <p className="mt-1 text-muted-foreground">Pick gender, skin, hair, expression, outfit, body, and accessories. Saved to your profile.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            {loading ? <div className="h-[260px] w-[260px] animate-pulse rounded-full bg-muted" /> : <DollAvatar config={cfg} size={260} />}
            <div className="flex w-full gap-2">
              <Button onClick={save} disabled={saving || loading} className="flex-1">{saving ? "Saving…" : "Save doll"}</Button>
              <Button variant="outline" onClick={() => setCfg(DEFAULT_DOLL)}>Reset</Button>
            </div>
          </div>

          <Tabs defaultValue="identity" className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="face">Face</TabsTrigger>
              <TabsTrigger value="hair">Hair</TabsTrigger>
              <TabsTrigger value="body">Body & outfit</TabsTrigger>
              <TabsTrigger value="extras">Accessories</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-5 pt-4">
              <Picker label="Gender" options={GENDERS} value={cfg.gender} onChange={(v) => set("gender", v)} />
              <Swatches label="Skin tone" colors={SKIN_TONES} value={cfg.skin} onChange={(v) => set("skin", v)} />
              <Swatches label="Background" colors={BG_COLORS} value={cfg.background} onChange={(v) => set("background", v)} />
            </TabsContent>

            <TabsContent value="face" className="space-y-5 pt-4">
              <Picker label="Expression" options={EXPRS} value={cfg.expression} onChange={(v) => set("expression", v)} />
            </TabsContent>

            <TabsContent value="hair" className="space-y-5 pt-4">
              <Picker label="Hairstyle" options={HAIRS} value={cfg.hair} onChange={(v) => set("hair", v)} />
              <Swatches label="Hair color" colors={HAIR_COLORS} value={cfg.hairColor} onChange={(v) => set("hairColor", v)} />
            </TabsContent>

            <TabsContent value="body" className="space-y-5 pt-4">
              <Picker label="Body shape" options={BODIES} value={cfg.body} onChange={(v) => set("body", v)} />
              <Picker label="Outfit" options={OUTFITS} value={cfg.outfit} onChange={(v) => set("outfit", v)} />
              <Swatches label="Outfit color" colors={OUTFIT_COLORS} value={cfg.outfitColor} onChange={(v) => set("outfitColor", v)} />
            </TabsContent>

            <TabsContent value="extras" className="space-y-5 pt-4">
              <Picker label="Accessory" options={ACCS} value={cfg.accessory} onChange={(v) => set("accessory", v)} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${value === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((col) => (
          <button
            key={col}
            type="button"
            aria-label={col}
            onClick={() => onChange(col)}
            style={{ background: col }}
            className={`h-9 w-9 rounded-full border-2 transition ${value === col ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
          />
        ))}
        <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-xs">
          +
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
        </label>
      </div>
    </div>
  );
}
