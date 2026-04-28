"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Crown, Link2, Type, Shuffle } from "lucide-react"
import type { Opening } from "@/lib/openings"
import { countMaxPairs } from "@/lib/openings"
import type { ChessTheme } from "@/lib/themes"
import { getStyles } from "@/lib/styles"

export type SessionConfig = {
  color: "white" | "black" | "random"
  count: number
  advanced: boolean
  mode: "moves" | "names"
}

type Props = {
  currentTheme: ChessTheme
  open: boolean
  onOpenChange: (open: boolean) => void
  openings: Opening[]
  onStart: (config: SessionConfig) => void
  isSaving?: boolean
}

export function StartSessionDialog({
  currentTheme,
  open,
  onOpenChange,
  openings,
  onStart,
  isSaving = false,
}: Props) {
  const s = getStyles(currentTheme)
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` }
  const [color, setColor] = useState<"white" | "black" | "random">("white")
  const [count, setCount] = useState<number>(1)
  const [advanced, setAdvanced] = useState<boolean>(false)
  const [mode, setMode] = useState<"moves" | "names">("moves")

  const maxPairs = useMemo(
    () => (open ? countMaxPairs(openings) : 0),
    [open, openings],
  )
  const maxSingles = openings.length
  const max =
    mode === "moves" ? Math.max(1, advanced ? maxPairs : maxSingles) : Math.max(1, maxSingles)
  const disabled =
    mode === "moves" ? (advanced ? maxPairs === 0 : maxSingles === 0) : maxSingles === 0

  useEffect(() => {
    if (!open) return
    setColor("white")
    setMode("moves")
    setAdvanced(false)
    setCount(Math.min(3, Math.max(1, maxSingles)))
  }, [open, maxSingles])

  // Re-clamp count when switching modes.
  useEffect(() => {
    setCount((prev) => {
      const effectiveMax =
        mode === "moves"
          ? advanced
            ? Math.max(1, maxPairs)
            : Math.max(1, maxSingles)
          : Math.max(1, maxSingles)
      return Math.min(Math.max(prev, 1), effectiveMax)
    })
  }, [advanced, maxPairs, maxSingles, mode])

  // Names mode doesn't use pairs.
  useEffect(() => {
    if (mode !== "names") return
    setAdvanced(false)
  }, [mode])

  function handleStart() {
    if (disabled) return
    const clamped = Math.min(Math.max(count, 1), max)
    onStart({ color, count: clamped, advanced: mode === "moves" ? advanced : false, mode })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={accentGlow}>
        <DialogHeader>
          <DialogTitle>Настройка тренировки</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Выберите цвет и количество дебютов для сессии.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Играть за</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setColor("white")}
                disabled={isSaving}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  color === "white"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <Crown className="h-6 w-6 fill-current" />
                Белых
              </button>
              <button
                type="button"
                onClick={() => setColor("random")}
                disabled={isSaving}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  color === "random"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <Shuffle className="h-6 w-6" />
                Случайно
              </button>
              <button
                type="button"
                onClick={() => setColor("black")}
                disabled={isSaving}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  color === "black"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <Crown className="h-6 w-6" />
                Чёрных
              </button>
            </div>
          </div>

          <label
            htmlFor="advanced-toggle"
            className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition ${
              mode === "moves" && advanced
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4" />
                Упрощенный режим (Пары)
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                Система ищет дебюты, где один PGN является началом другого, и
                склеивает их в одну партию: короткий вариант переходит в длинный.
              </span>
              <span className="text-xs text-muted-foreground">
                Доступно пар:{" "}
                <span
                  className={`font-semibold ${
                    maxPairs > 0 ? "text-foreground" : "text-destructive"
                  }`}
                >
                  {maxPairs}
                </span>
              </span>
            </div>
            <Switch
              id="advanced-toggle"
              checked={mode === "moves" && advanced}
              onCheckedChange={setAdvanced}
              disabled={mode === "names" || (maxPairs === 0 && openings.length > 0) || isSaving}
            />
          </label>

          <label
            htmlFor="names-toggle"
            className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition ${
              mode === "names"
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Type className="h-4 w-4" />
                Усложненный режим (Названия)
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                Игра наоборот: показывается конечная позиция дебюта, а вам нужно
                правильно ввести его название.
              </span>
              <span className="text-xs text-muted-foreground">
                Подсказка: регистр букв и лишние пробелы не важны.
              </span>
            </div>
            <Switch
              id="names-toggle"
              checked={mode === "names"}
              onCheckedChange={(v) => setMode(v ? "names" : "moves")}
              disabled={maxSingles === 0 || isSaving}
            />
          </label>

          <div className="flex flex-col gap-2">
            <label htmlFor="session-count" className="text-sm font-medium">
              Количество {mode === "moves" && advanced ? "пар" : "дебютов"}
            </label>
            <input
              id="session-count"
              type="number"
              min={1}
              max={max}
              value={count}
              disabled={isSaving}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10)
                if (Number.isNaN(v)) setCount(1)
                else setCount(Math.min(Math.max(v, 1), max))
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition
                focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              {mode === "moves" && advanced ? (
                <>
                  Максимум пар, которые можно собрать:{" "}
                  <span className="font-medium text-foreground">{maxPairs}</span>.
                  Если полное число пар собрать не удастся, сессия стартует с теми,
                  что найдены.
                </>
              ) : (
                <>
                  Доступно в базе:{" "}
                  <span className="font-medium text-foreground">{maxSingles}</span>.
                  Дебюты внутри сессии не повторяются.
                </>
              )}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 rounded-md border border-border bg-transparent px-4 text-sm font-medium transition
                hover:bg-accent disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={disabled || isSaving}
              className="h-10 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition
                hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-primary/20"
            >
              Старт
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
