"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parsePgn, type Opening } from "@/lib/openings"
import { Crown, Search, X, Shuffle } from "lucide-react"
import type { ChessTheme } from "@/lib/themes"
import { getStyles } from "@/lib/styles"

export type CustomSessionConfig = {
  color: "white" | "black" | "random"
  openingIds: string[]
}

type Props = {
  currentTheme: ChessTheme
  open: boolean
  onOpenChange: (open: boolean) => void
  openings: Opening[]
  onStart: (config: CustomSessionConfig) => void
  initialSelection?: string[]
  isSaving?: boolean
}

export function CustomSessionDialog({ currentTheme, open, onOpenChange, openings, onStart, initialSelection, isSaving = false }: Props) {
  const s = getStyles(currentTheme)
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` }
  const [color, setColor] = useState<"white" | "black" | "random">("white")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setColor("white")
    setQuery("")
    setSelected(new Set(initialSelection || []))
  }, [open, initialSelection])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return openings

    const moveCountQuery = parseInt(q, 10)
    const isNumeric = !isNaN(moveCountQuery) && /^\d+$/.test(q)

    return openings.filter((o) => {
      const matchesText =
        o.name.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.pgn.toLowerCase().includes(q)

      if (matchesText) return true

      if (isNumeric) {
        const parsed = parsePgn(o.pgn)
        return parsed.fullMoveCount === moveCountQuery
      }

      return false
    })
  }, [openings, query])

  const selectedCount = selected.size
  const canStart = selectedCount > 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const o of filtered) next.add(o.id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function handleStart() {
    if (!canStart) return
    onStart({ color, openingIds: Array.from(selected) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(448px,calc(100vw-1rem))] max-w-none p-0 bg-card border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" style={accentGlow}>
        <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1 min-h-0"
        >
          <DialogHeader>
            <DialogTitle>Своя игра</DialogTitle>
            <DialogDescription className="text-muted-foreground" >
              Выберите дебюты для тренировки чекбоксами и запустите сессию.
            </DialogDescription>
          </DialogHeader>

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
                Черных
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSaving}
                placeholder="Поиск по названию, описанию или ходам..."
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 text-sm outline-none transition
                  focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  disabled={isSaving}
                  aria-label="Очистить поиск"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Выбрано: <span className="font-medium text-foreground">{selectedCount}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  disabled={filtered.length === 0 || isSaving}
                  className="h-8 rounded-md border border-border bg-transparent px-3 text-xs font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Выбрать все (по фильтру)
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedCount === 0 || isSaving}
                  className="h-8 rounded-md border border-border bg-transparent px-3 text-xs font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Сбросить
                </button>
              </div>
            </div>

            <div
              className="overflow-y-auto rounded-lg border border-border bg-card"
              style={{ maxHeight: "min(360px, 35vh)" }}
            >
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Ничего не найдено.</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filtered.map((o) => {
                    const checked = selected.has(o.id)
                    return (
                      <li key={o.id}>
                        <label className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-accent/50 ${isSaving ? "pointer-events-none opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(o.id)}
                            disabled={isSaving}
                            className="mt-1 h-4 w-4 accent-primary"
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">
                              {o.name}
                            </span>
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {o.description || "Без описания"}
                            </span>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 rounded-md border border-border bg-transparent px-4 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart || isSaving}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition
                hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Старт с выбранными
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}