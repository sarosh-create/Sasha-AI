import { useEffect, useRef, useState } from "react";
import { Mic, Square, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Voice message button: speak and your words are typed into the message box. */
export function VoiceButton({ onText, disabled }: { onText: (t: string) => void; disabled?: boolean }) {
  const [on, setOn] = useState(false);
  const rec = useRef<any>(null);
  useEffect(() => () => rec.current?.stop(), []);
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice messages aren't supported in this browser — try Chrome or Safari."); return; }
    const r = new SR();
    r.lang = navigator.language || "en-GB";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t.trim()) onText(t.trim());
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed") toast.error("Allow microphone access to send voice messages."); };
    r.onend = () => setOn(false);
    rec.current = r; r.start(); setOn(true);
  };
  return (
    <button type="button" onClick={toggle} disabled={disabled} aria-label={on ? "Stop recording" : "Record a voice message"} aria-pressed={on}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border border-input ${on ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-background text-foreground hover:bg-accent"}`}>
      {on ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}

/** Picture button: picks a photo and shrinks it to a small JPEG data URL. */
export function PictureButton({ onImage, disabled }: { onImage: (dataUrl: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      onImage(c.toDataURL("image/jpeg", 0.8));
    } catch { toast.error("Couldn't read that picture."); }
    if (ref.current) ref.current.value = "";
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" aria-label="Attach a picture" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => ref.current?.click()} disabled={disabled} aria-label="Attach a picture"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-input bg-background text-foreground hover:bg-accent">
        <ImagePlus className="h-4 w-4" />
      </button>
    </>
  );
}

export function PicturePreview({ src, onClear }: { src: string | null; onClear: () => void }) {
  if (!src) return null;
  return (
    <div className="relative mb-2 inline-block">
      <img src={src} alt="Picture to send" className="h-20 rounded-md border border-border object-cover" />
      <button type="button" onClick={onClear} aria-label="Remove picture" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background"><X className="h-3 w-3" /></button>
    </div>
  );
}
