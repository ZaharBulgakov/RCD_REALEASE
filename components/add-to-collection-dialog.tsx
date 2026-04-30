"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parsePgn, type Opening, OPENINGS_LIMIT, COLLECTION_OPENINGS_LIMIT } from "@/lib/openings"
import { Search, X, Plus } from "lucide-react"


type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  allOpenings: Opening[]
  currentOpeningIds: string[]
  onConfirm: (selectedIds: string[]) => Promise<void>
  isSaving?: boolean
}

export function AddToCollectionDialog({ open, onOpenChange, allOpenings, currentOpeningIds, onConfirm, isSaving = false }: Props) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSelected(new Set(currentOpeningIds))
  }, [open, currentOpeningIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allOpenings

    const moveCountQuery = parseInt(q, 10)
    const isNumeric = !isNaN(moveCountQuery) && /^\d+$/.test(q)

    return allOpenings.filter((o) => {
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
  }, [allOpenings, query])

  const selectedCount = selected.size

  function toggle(id: string) {
    setSelected((prev) => {
      if (!prev.has(id) && prev.size >= COLLECTION_OPENINGS_LIMIT) return prev
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const o of filtered) {
        if (next.size >= COLLECTION_OPENINGS_LIMIT) break
        next.add(o.id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleConfirm() {
    await onConfirm(Array.from(selected))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(448px,calc(100vw-1rem))] max-w-none p-0 bg-card border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Добавить в коллекцию
              <span className={`text-sm font-normal ${selected.size >= COLLECTION_OPENINGS_LIMIT ? 'text-destructive' : 'text-muted-foreground'}`}>
                {selected.size} из {COLLECTION_OPENINGS_LIMIT}
              </span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Выберите дебюты из основной базы для добавления в текущую коллекцию.
            </DialogDescription>
          </DialogHeader>

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
              style={{ maxHeight: "min(400px, 45vh)" }}
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
              onClick={handleConfirm}
              disabled={isSaving}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition
                hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? "Сохранение..." : (
                <>
                  <Plus className="h-4 w-4" />
                  Применить
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
