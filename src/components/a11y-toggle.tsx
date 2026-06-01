import { Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useA11y, A11Y_MODES } from "@/lib/a11y";

export function A11yToggle() {
  const { mode, setMode } = useA11y();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Accessibility & color modes"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Color mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {A11Y_MODES.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setMode(m.id)}
            className={mode === m.id ? "bg-secondary font-semibold" : ""}
          >
            <div className="flex flex-col">
              <span>{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.hint}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
