"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Trash2, ArrowLeft, Plus, Search, Info, BookOpen } from "lucide-react"
import { OpeningCard } from "./opening-card"
import { type Opening, parsePgn } from "@/lib/openings"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AddOpeningForm } from "./add-opening-form"
import { BoardWithCoords } from "./board-with-coords"

type Props = {
  opening: Opening
  mittelspiels: Opening[]
  onBack: () => void
  onStudy: (opening: Opening) => void
  onEdit: (opening: Opening) => void
  onDelete: (id: string) => Promise<void>
  onAddMittelspiel: (opening: Opening) => Promise<string | null>
  currentTheme: ChessTheme
  isSaving?: boolean
}

// Размеры — единый источник правды, чтобы линии точно совпадали с карточками
const CENTER_CARD_W = 208  // w-52
const MITTEL_CARD_W = 144  // w-36
const ORBIT_RADIUS = 240   // px от центра до центра карточки-миттельшпиля
const CAROUSEL_SIZE = ORBIT_RADIUS * 2 + MITTEL_CARD_W + 16 // +16 запас

export function OpeningDetailScreen({
  opening,
  mittelspiels,
  onBack,
  onStudy,
  onEdit,
  onDelete,
  onAddMittelspiel,
  currentTheme,
  isSaving = false,
}: Props) {
  const [selectedMittelspiel, setSelectedMittelspiel] = useState<Opening | null>(null)
  const [query, setQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // Web Animations API refs для плавного управления скоростью карусели
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const rateRafRef = useRef<number | null>(null)
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const s = getStyles(currentTheme)
  const accentGlow = {
    boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}`,
  }

  const filteredMittelspiels = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mittelspiels
    return mittelspiels.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    )
  }, [mittelspiels, query])

  // Для анимации используем полный список — скрываем через opacity,
  // чтобы не пересоздавать DOM-узлы (иначе анимация сбрасывается)
  const filteredIds = useMemo(() => new Set(filteredMittelspiels.map((m) => m.id)), [filteredMittelspiels])

  const activeOpening = selectedMittelspiel || opening
  const isMainOpening = !selectedMittelspiel

  const confirmDelete = async () => {
    if (!deleteId) return
    await onDelete(deleteId)
    if (selectedMittelspiel?.id === deleteId) setSelectedMittelspiel(null)
    setDeleteId(null)
  }

  // Равномерное распределение по окружности: угол зависит только от индекса в массиве.
  // Позиции НЕ стабилизируем по id — вместо этого решаем проблему "переворота" иначе:
  // новая карточка получает animation-delay синхронизированный с текущим временем анимации,
  // чтобы counter-rotation начиналась с правильного угла.
  const SPIN_DURATION = 20000 // мс, должно совпадать с CSS

  // Момент монтирования компонента — от него считаем текущий угол анимации
  const mountTimeRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0)

  // Для каждой карточки запоминаем её animation-delay (отрицательный, = прогресс анимации в момент монтирования карточки)
  const cardDelayRef = useRef<Map<string, number>>(new Map())

  const getCardDelay = (id: string): number => {
    if (!cardDelayRef.current.has(id)) {
      // Сколько мс прошло с монтирования компонента — это и есть смещение для синхронизации
      const elapsed = typeof performance !== "undefined" ? performance.now() - mountTimeRef.current : 0
      // Отрицательный delay = "анимация уже прошла столько-то мс"
      const delay = -(elapsed % SPIN_DURATION)
      cardDelayRef.current.set(id, delay)
    }
    return cardDelayRef.current.get(id)!
  }

  // Плавно интерполирует playbackRate у всех анимаций карусели
  const animateRate = useCallback((targetRate: number, durationMs: number) => {
    if (rateRafRef.current) cancelAnimationFrame(rateRafRef.current)

    const anims: Animation[] = []
    if (carouselRef.current) anims.push(...carouselRef.current.getAnimations())
    cardRefsMap.current.forEach((el) => anims.push(...el.getAnimations()))
    if (anims.length === 0) return

    const startRates = anims.map((a) => a.playbackRate)
    const startTime = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1)
      // ease-in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      anims.forEach((anim, i) => {
        anim.playbackRate = startRates[i] + (targetRate - startRates[i]) * ease
      })
      if (t < 1) rateRafRef.current = requestAnimationFrame(tick)
    }
    rateRafRef.current = requestAnimationFrame(tick)
  }, [])

  const handleMittelspielClick = (m: Opening) => {
    setSelectedMittelspiel(m)
    if (rateTimerRef.current) clearTimeout(rateTimerRef.current)
    // Плавно тормозим за 1s до ~0
    animateRate(0.02, 1000)
    // Через 2.5s плавно разгоняем обратно до 1
    rateTimerRef.current = setTimeout(() => animateRate(1, 1500), 2500)
  }

  const getPos = (index: number, total: number) => {
    if (total === 0) return { x: 0, y: 0 }
    // Равномерное распределение: -90° чтобы первая карточка была сверху
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: Math.cos(angle) * ORBIT_RADIUS,
      y: Math.sin(angle) * ORBIT_RADIUS,
    }
  }

  const activeParsed = useMemo(() => parsePgn(activeOpening.pgn), [activeOpening.pgn])
  const boardOrientation = useMemo((): "white" | "black" => {
    if (activeOpening.leadingSide === "white") return "white"
    if (activeOpening.leadingSide === "black") return "black"
    const fenActiveColor = activeParsed.finalFen.split(" ")[1]
    return fenActiveColor === "b" ? "white" : "black"
  }, [activeOpening.leadingSide, activeParsed.finalFen])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* ХЕДЕР */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-md z-50">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl font-bold uppercase tracking-widest">
          <ArrowLeft className="h-5 w-5" />
          Назад
        </Button>
        <h1 className="text-xl font-black tracking-[0.3em] text-primary sm:text-2xl">
          {opening.name.toUpperCase()}
        </h1>
        <div className="w-24" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ЦЕНТРАЛЬНАЯ ОБЛАСТЬ */}
        <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-accent/5">

          {/* Кнопка "Добавить" — z-30, всегда поверх карусели */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="h-10 rounded-full px-6 text-xs font-bold uppercase tracking-widest"
              style={accentGlow}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Добавить миттельшпиль
            </Button>
          </div>

          {/* Карусель */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: CAROUSEL_SIZE, height: CAROUSEL_SIZE }}
          >
            {/*
              Вращающийся контейнер (по часовой, 20s).
              Рендерим ПОЛНЫЙ список mittelspiels, а не filteredMittelspiels —
              это не даёт React пересоздавать узлы при поиске, поэтому
              анимация не сбрасывается и карточки не "переворачиваются".
              Скрытые (не в поиске) карточки получают opacity:0 + pointer-events:none.

              SVG-линии вынесены ВНУТРЬ вращающегося div, чтобы они
              синхронно вращались вместе с карточками.
            */}
            <div
              ref={carouselRef}
              className="absolute inset-0"
              style={{
                animation: "carousel-spin 20s linear infinite",
              }}
            >
              {/* Линии внутри вращающегося контейнера — синхронны с карточками */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={CAROUSEL_SIZE}
                height={CAROUSEL_SIZE}
                style={{ zIndex: 0 }}
              >
                {mittelspiels.map((m, i) => {
                  const pos = getPos(i, mittelspiels.length)
                  const cx = CAROUSEL_SIZE / 2
                  const cy = CAROUSEL_SIZE / 2
                  const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y)
                  const ux = pos.x / dist
                  const uy = pos.y / dist
                  const x1 = cx + ux * (CENTER_CARD_W / 2)
                  const y1 = cy + uy * (CENTER_CARD_W / 2)
                  const x2 = cx + pos.x - ux * (MITTEL_CARD_W / 2)
                  const y2 = cy + pos.y - uy * (MITTEL_CARD_W / 2)
                  const visible = filteredIds.has(m.id)

                  return (
                    <line
                      key={m.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
                    />
                  )
                })}
              </svg>

              {mittelspiels.map((m, i) => {
                const pos = getPos(i, mittelspiels.length)
                const isSelected = selectedMittelspiel?.id === m.id
                const visible = filteredIds.has(m.id)

                return (
                  <div
                    key={m.id}
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%))`,
                      width: MITTEL_CARD_W,
                      zIndex: 10,
                      opacity: visible ? 1 : 0,
                      pointerEvents: visible ? "auto" : "none",
                      transition: "opacity 0.3s",
                    }}
                  >
                    <div
                      ref={(el) => {
                        if (el) cardRefsMap.current.set(m.id, el)
                        else cardRefsMap.current.delete(m.id)
                      }}
                      className="hover:scale-105"
                      style={{
                        animation: `carousel-spin-reverse 20s linear ${getCardDelay(m.id)}ms infinite`,
                        willChange: "transform",
                        ...(isSelected ? accentGlow : {}),
                      }}
                    >
                      {/* scale-wrapper: уменьшает бейджи; скрывает иконки редакт./удал. через CSS */}
                      <div style={{ fontSize: "0.7rem", lineHeight: 1.2 }} className="mittel-card-wrapper">
                        <OpeningCard
                          opening={m}
                          onDelete={async () => setDeleteId(m.id)}
                          onEdit={onEdit}
                          onStudy={() => handleMittelspielClick(m)}
                          theme={currentTheme}
                          isSaving={isSaving}
                          isSelected={isSelected}
                          compact
                          hideActions
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Центральный дебют — поверх всего, не вращается */}
            <div
              className="relative z-20 transition-all duration-500 hover:scale-105"
              style={{ width: CENTER_CARD_W, ...accentGlow }}
            >
              <OpeningCard
                opening={opening}
                onDelete={async () => setDeleteId(opening.id)}
                onEdit={onEdit}
                onStudy={() => setSelectedMittelspiel(null)}
                theme={currentTheme}
                isSaving={isSaving}
                isSelected={isMainOpening}
                hideActions
              />
            </div>
          </div>

          {/* Поиск снизу */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-6">
            <div className="group relative w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск миттельшпилей..."
                className="h-10 w-full rounded-full border border-border bg-card pl-11 pr-5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
                style={accentGlow}
              />
            </div>
          </div>
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ */}
        <aside className="hidden w-96 flex-col border-l border-border bg-card/20 md:flex shrink-0">
          {/* Доска — фиксированный квадрат сверху */}
          <div className="shrink-0 p-6 pb-0">
            <div className="aspect-square w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" style={accentGlow}>
              <BoardWithCoords
                orientation={boardOrientation}
                boardLight={currentTheme.systemDesign?.boardLight}
                boardDark={currentTheme.systemDesign?.boardDark}
                options={{
                  id: `detail-preview-${activeOpening.id}`,
                  position: activeParsed.finalFen,
                  allowDragging: false,
                  showAnimations: true,
                  boardStyle: { width: "100%", height: "100%" },
                }}
              />
            </div>
          </div>

          {/* Инфо-блок под доской */}
          <div className="shrink-0 px-6 pt-5">
            <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {isMainOpening ? "Основной дебют" : "Миттельшпиль"}
                </p>
              </div>
              <h2 className="text-lg font-black truncate tracking-tight">{activeOpening.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground pt-1">
                {activeOpening.description || "Нет описания"}
              </p>
              <div className="flex gap-4 pt-2">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ходов</span>
                  <span className="text-base font-black text-primary">{activeParsed.moveCount}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Сторона</span>
                  <span className="text-base font-black text-primary uppercase">
                    {activeOpening.leadingSide === "random" ? "Случ" : activeOpening.leadingSide === "white" ? "Бел" : "Чер"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки стопкой снизу */}
          <div className="shrink-0 px-6 pt-4 pb-6 space-y-3">
            <Button
              onClick={() => onStudy(activeOpening)}
              className="w-full h-14 gap-3 rounded-2xl text-base font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              style={accentGlow}
            >
              <BookOpen className="h-5 w-5" />
              Режим изучения
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(activeOpening)}
              className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteId(activeOpening.id)}
              className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-error hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </aside>
      </div>

      {/* Модалки */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="rounded-3xl border-border bg-card p-0 overflow-hidden dialog-wide flex flex-col" style={accentGlow}>
          {/* Header — fixed */}
          <div className="px-8 py-6 border-b border-border text-center shrink-0">
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-center">Добавить миттельшпиль</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
              Для этого миттельшпиля автоматически будет добавлен префикс:{" "}
              <span className="font-mono text-primary">{opening.pgn}</span>
            </DialogDescription>
          </div>
          {/* Body — scrollable */}
          <div className="p-6">
            <AddOpeningForm
              onSave={async (o) => {
                const err = await onAddMittelspiel(o)
                if (!err) setAddDialogOpen(false)
                return err
              }}
              parentPgn={opening.pgn}
              parentId={opening.id}
              isSaving={isSaving}
              currentTheme={currentTheme}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-3xl border-border bg-card" style={accentGlow}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <AlertTriangle className="h-5 w-5 text-error" />
              {deleteId === opening.id ? "Удалить основной дебют?" : "Удалить миттельшпиль?"}
            </DialogTitle>
            <DialogDescription>
              {deleteId === opening.id
                ? "ВНИМАНИЕ: Это действие удалит дебют И ВСЕ его миттельшпили!"
                : "Это действие переместит миттельшпиль в историю удалений."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="rounded-xl">Отмена</Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-xl">Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyframes карусели + стили компактных карточек */}
      <style>{`
        @keyframes carousel-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes carousel-spin-reverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        /* Уменьшаем бейджи внутри карточек миттельшпилей */
        .mittel-card-wrapper [class*="badge"],
        .mittel-card-wrapper [class*="Badge"],
        .mittel-card-wrapper span[class*="text-xs"],
        .mittel-card-wrapper span[class*="rounded"],
        .mittel-card-wrapper div[class*="rounded-full"] {
          font-size: 0.55rem !important;
          padding: 1px 5px !important;
          line-height: 1.4 !important;
        }
        .mittel-card-wrapper svg {
          width: 10px !important;
          height: 10px !important;
        }
      `}</style>
    </div>
  )
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
