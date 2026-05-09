"use client"

/**
 * StartSessionDialog — переработанный диалог запуска сессии.
 *
 * Изменения vs старая версия:
 * 1. Юзер выбирает ДЕБЮТЫ (корневые opening без parentId) из списка карточек.
 *    Каждый выбранный дебют автоматически добавляет себя + все свои миттельшпили в счётчик.
 * 2. Размер списка задаёт система (= сумма всех выбранных дебютов + их миттельшпилей).
 *    Поле ввода количества убрано.
 * 3. "Выбрать все / Снять все" — одна кнопка-toggle.
 * 4. Режим "Пары" убран.
 * 5. Ведущая сторона убрана из UI (система сама определяет по leadingSide дебюта).
 * 6. Остался режим "Усложнённый (Названия)" — опциональный toggle.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Check, BookOpen, ChevronDown, ChevronUp, Layers } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "./ui/button"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"
import type { Opening } from "@/lib/openings"
import { parsePgn } from "@/lib/openings"
import { BoardWithCoords } from "./board-with-coords"

// ── Типы ──────────────────────────────────────────────────────────────────────

export type SessionConfig = {
  /** Все id, которые войдут в сессию (дебюты + их миттельшпили). */
  openingIds: string[]
  /** Режим игры. */
  mode: "moves" | "names"
  /** Сторона определяется per-opening через leadingSide — цвет больше не задаётся глобально. */
  color: "per-opening"
  advanced: boolean
  count: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Все opening пользователя (дебюты + миттельшпили). */
  openings: Opening[]
  onStart: (config: SessionConfig) => void
  isSaving?: boolean
  currentTheme: ChessTheme
}

// ── LazyBoard — монтирует доску только когда элемент виден в скролле ─────────

type LazyBoardProps = {
  orientation: "white" | "black"
  position: string
  boardLight?: string
  boardDark?: string
  boardId: string
}

function LazyBoard({ orientation, position, boardLight, boardDark, boardId }: LazyBoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: "100px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="pointer-events-none h-full w-full select-none">
      {visible ? (
        <BoardWithCoords
          orientation={orientation}
          boardLight={boardLight}
          boardDark={boardDark}
          options={{
            id: boardId,
            position,
            allowDragging: false,
            showAnimations: false,
            boardStyle: { width: "100%", height: "100%" },
          }}
        />
      ) : (
        <div className="h-full w-full bg-muted/30 animate-pulse rounded" />
      )}
    </div>
  )
}

// ── Компонент ────────────────────────────────────────────────────────────────

export function StartSessionDialog({
  open,
  onOpenChange,
  openings,
  onStart,
  isSaving,
  currentTheme,
}: Props) {
  const s = useMemo(() => getStyles(currentTheme), [currentTheme])
  const accentGlow = useMemo(() => ({
    boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 60%, transparent), 0 0 16px 2px ${s.glow}`,
  }), [s.accent, s.glow])

  // Только корневые дебюты (без parentId)
  const rootOpenings = useMemo(
    () => openings.filter((o) => !o.parentId),
    [openings]
  )

  // Карта: дебют → его миттельшпили
  const mittelspielMap = useMemo(() => {
    const map = new Map<string, Opening[]>()
    for (const o of openings) {
      if (o.parentId) {
        if (!map.has(o.parentId)) map.set(o.parentId, [])
        map.get(o.parentId)!.push(o)
      }
    }
    return map
  }, [openings])

  // Выбранные корневые дебюты
  const [selectedRootIds, setSelectedRootIds] = useState<Set<string>>(new Set())
  const [nameMode, setNameMode] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allSelected = rootOpenings.length > 0 && selectedRootIds.size === rootOpenings.length

  function toggleRoot(id: string) {
    setSelectedRootIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedRootIds(new Set())
    } else {
      setSelectedRootIds(new Set(rootOpenings.map((o) => o.id)))
    }
  }

  // Подсчёт: сколько позиций войдёт в сессию
  const { totalCount, breakdown } = useMemo(() => {
    let total = 0
    const bd: { name: string; count: number }[] = []
    for (const id of selectedRootIds) {
      const root = rootOpenings.find((o) => o.id === id)
      if (!root) continue
      const mittels = mittelspielMap.get(id) ?? []
      const count = 1 + mittels.length
      total += count
      bd.push({ name: root.name, count })
    }
    return { totalCount: total, breakdown: bd }
  }, [selectedRootIds, rootOpenings, mittelspielMap])

  // Кешируем parsePgn для всех дебютов — не пересчитываем при каждом рендере
  const parsedMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parsePgn>>()
    for (const o of openings) {
      map.set(o.id, parsePgn(o.pgn))
    }
    return map
  }, [openings])

  function handleStart() {
    if (selectedRootIds.size === 0) return

    // Собираем все id: корневые + их миттельшпили
    const ids: string[] = []
    for (const id of selectedRootIds) {
      ids.push(id)
      const mittels = mittelspielMap.get(id) ?? []
      ids.push(...mittels.map((m) => m.id))
    }

    onStart({
      openingIds: ids,
      mode: nameMode ? "names" : "moves",
      color: "per-opening",
      advanced: false,
      count: ids.length,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0"
        style={accentGlow}
      >
        {/* Заголовок */}
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle className="text-xl font-black uppercase tracking-wider">
            Настройка тренировки
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Выберите дебюты. Система автоматически включит все их миттельшпили.
          </DialogDescription>
        </DialogHeader>

        {/* Тело — скроллится */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Шапка списка + кнопка "Выбрать все" */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Дебюты ({rootOpenings.length})
            </span>
            {rootOpenings.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
              >
                {allSelected ? "Снять все" : "Выбрать все"}
              </button>
            )}
          </div>

          {/* Список дебютов */}
          {rootOpenings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Нет дебютов. Добавьте первый дебют на главном экране.
            </div>
          ) : (
            <div className="space-y-2">
              {rootOpenings.map((root) => {
                const isSelected = selectedRootIds.has(root.id)
                const mittels = mittelspielMap.get(root.id) ?? []
                const isExpanded = expandedId === root.id
                const parsed = parsedMap.get(root.id)!
                const boardOrientation: "white" | "black" =
                  root.leadingSide === "white"
                    ? "white"
                    : root.leadingSide === "black"
                    ? "black"
                    : parsed.finalFen.split(" ")[1] === "b"
                    ? "white"
                    : "black"

                return (
                  <div
                    key={root.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    {/* Строка дебюта */}
                    <div
                      className="flex cursor-pointer items-center gap-3 p-3"
                      onClick={() => toggleRoot(root.id)}
                    >
                      {/* Мини-доска */}
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50">
                        <LazyBoard
                          orientation={boardOrientation}
                          position={parsed.finalFen}
                          boardLight={currentTheme.systemDesign?.boardLight}
                          boardDark={currentTheme.systemDesign?.boardDark}
                          boardId={`sess-${root.id}`}
                        />
                      </div>

                      {/* Текст */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold leading-tight">{root.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {mittels.length > 0
                            ? `${mittels.length} миттельшпил${pluralMittels(mittels.length)}`
                            : "Без миттельшпилей"}
                          {" · "}
                          {parsed.moveCount} ход{pluralMoves(parsed.moveCount)}
                        </p>
                      </div>

                      {/* Чекбокс */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />}
                      </div>

                      {/* Раскрыть миттельшпили */}
                      {mittels.length > 0 && (
                        <button
                          type="button"
                          className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(isExpanded ? null : root.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Раскрытый список миттельшпилей */}
                    {isExpanded && mittels.length > 0 && (
                      <div className="border-t border-border/50 bg-muted/30 px-3 py-2 space-y-1">
                        {mittels.map((m) => {
                          const mp = parsedMap.get(m.id)!
                          return (
                            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                              <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                {m.name}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {mp.moveCount} ход{pluralMoves(mp.moveCount)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Счётчик позиций */}
          {selectedRootIds.size > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Позиций в сессии: {totalCount}
              </p>
              <div className="space-y-0.5">
                {breakdown.map((b) => (
                  <p key={b.name} className="text-[11px] text-muted-foreground">
                    {b.name} — {b.count} поз.
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Режим "Названия" */}
          <div
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
            onClick={() => setNameMode((v) => !v)}
          >
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-bold">
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Усложнённый режим (Названия)</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Игра наоборот: показывается конечная позиция дебюта, а вам нужно правильно ввести его название.
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Подсказка: регистр букв и лишние пробелы не важны.
              </p>
            </div>
            {/* Toggle */}
            <div
              className={`mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 transition-all duration-200 ${
                nameMode ? "border-primary bg-primary" : "border-border bg-muted"
              }`}
            >
              <div
                className={`h-full w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  nameMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Футер */}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4 flex justify-between items-center gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Отмена
          </Button>
          <Button
            onClick={handleStart}
            disabled={selectedRootIds.size === 0 || isSaving}
            className="gap-2 rounded-xl px-6 font-bold uppercase tracking-widest"
            style={selectedRootIds.size > 0 ? accentGlow : undefined}
          >
            <BookOpen className="h-4 w-4" />
            Старт · {totalCount} поз.
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function pluralMoves(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return ""
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "а"
  return "ов"
}

function pluralMittels(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "ь"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "я"
  return "ей"
}
