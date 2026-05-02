import { LeadingSideIcon } from "./leading-side-icon"
import type { LeadingSide } from "@/lib/openings"

type SelectorProps = {
  value: LeadingSide
  onChange: (side: LeadingSide) => void
  disabled?: boolean
  accentStyle?: React.CSSProperties
}

const OPTIONS: { value: LeadingSide; label: string }[] = [
  { value: "white", label: "Белые" },
  { value: "random", label: "Случайно" },
  { value: "black", label: "Чёрные" },
]

export function LeadingSideSelector({ value, onChange, disabled, accentStyle }: SelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-foreground/80 ml-1">Ведущая сторона</span>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition
              disabled:opacity-50 disabled:cursor-not-allowed
              ${value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/50"
              }`}
            style={value === opt.value && accentStyle ? accentStyle : {}}
          >
            <LeadingSideIcon side={opt.value} size={22} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
