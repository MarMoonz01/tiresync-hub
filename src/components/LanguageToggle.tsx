import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  variant?: "default" | "compact";
  className?: string;
}

export function LanguageToggle({ variant = "default", className }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === "en" ? "th" : "en")}
        className={cn("text-xs font-medium", className)}
      >
        {language === "en" ? "TH" : "EN"}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-muted/50", className)}>
      <button
        onClick={() => setLanguage("en")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          language === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("th")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          language === "th"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        ไทย
      </button>
    </div>
  );
}
