import { Delete } from "lucide-react";

interface PinPadProps {
  pin: string;
  onDigit: (d: string) => void;
  onDelete: () => void;
  err?: boolean;
}

/** Prototype-style PIN pad: 4 dots + 3x4 keypad. */
export function PinPad({ pin, onDigit, onDelete, err }: PinPadProps) {
  return (
    <>
      <div className={`flex justify-center gap-3.5 mt-2 mb-5 ${err ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              err ? "bg-rose-500 border-rose-500" : pin.length > i ? "bg-primary border-primary" : "border-border"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(String(d))}
            className="h-14 rounded-2xl bg-secondary text-xl font-bold tabular-nums active:scale-95 hover:bg-secondary/70 transition"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => onDigit("0")}
          className="h-14 rounded-2xl bg-secondary text-xl font-bold tabular-nums active:scale-95 hover:bg-secondary/70 transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-14 rounded-2xl text-muted-foreground flex items-center justify-center active:scale-95 hover:bg-secondary/50 transition"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
