import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

interface Props {
  variant?: "ghost" | "primary";
  className?: string;
  label?: string;
}

/** Renders an "Install app" button only when the browser allows PWA installation. */
export function InstallAppButton({ variant = "ghost", className = "", label = "ติดตั้งแอป" }: Props) {
  const { canInstall, install } = usePwaInstall();
  if (!canInstall) return null;

  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-card hover:bg-secondary";

  return (
    <button
      onClick={install}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${styles} ${className}`}
    >
      <Download className="w-4 h-4" /> {label}
    </button>
  );
}
