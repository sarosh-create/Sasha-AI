import falconLogo from "@/assets/falcon-logo.png";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={falconLogo}
        alt="Sasha AI falcon logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
      />
      <span className="font-display text-lg font-semibold tracking-tight">
        Sasha <span className="text-accent">AI</span>
      </span>
    </div>
  );
}
