"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react"
import { Pencil, Trash2, ArrowLeft, Plus, Search, Info, BookOpen, Eye, X, Trophy } from "lucide-react"
import { OpeningCard } from "./opening-card"
import { type Opening, type Party, parsePgn } from "@/lib/openings"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AddOpeningForm } from "./add-opening-form"
import { BoardWithCoords } from "./board-with-coords"
import { FullPartiesSection } from "./full-parties-section"

type Props = {
  opening: Opening
  mittelspiels: Opening[]
  parties: Party[]
  onBack: () => void  // wrapped in startTransition at call site
  onStudy: (opening: Opening) => void
  onStudyParty: (party: Party) => void
  onEdit: (opening: Opening) => void
  onEditParty: (party: Party) => void
  onDelete: (id: string) => Promise<void>
  onDeleteParty: (id: string) => Promise<void>
  onAddMittelspiel: (opening: Opening) => Promise<string | null>
  onAddParty: () => void
  onPartyClick: (party: Party) => void
  currentTheme: ChessTheme
  isSaving?: boolean
}

// Размеры — единый источник правды, чтобы линии точно совпадали с карточками
const CENTER_CARD_W = 208  // w-52
const MITTEL_CARD_W = 144  // w-36
const ORBIT_RADIUS = 240   // px от центра до центра карточки-миттельшпиля
const CAROUSEL_SIZE = ORBIT_RADIUS * 2 + MITTEL_CARD_W + 16 // +16 запас

// Мобильная карусель — вписывается в ~360px экран
const MOB_CARD_RENDER_W = 140
const MOB_CENTER_RENDER_W = 180
const MOB_MITTEL_SCALE = 0.52
const MOB_CENTER_SCALE = 0.58
const MOB_MITTEL_W = Math.round(MOB_CARD_RENDER_W * MOB_MITTEL_SCALE)
const MOB_CENTER_W = Math.round(MOB_CENTER_RENDER_W * MOB_CENTER_SCALE)

const MOB_ORBIT = 135
const MOB_CAROUSEL_SIZE = MOB_ORBIT * 2 + MOB_MITTEL_W + 8

function AlertTriangle({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      className={className}
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

export function OpeningDetailScreen({
  opening,
  mittelspiels,
  parties,
  onBack,
  onStudy,
  onStudyParty,
  onEdit,
  onEditParty,
  onDelete,
  onDeleteParty,
  onAddMittelspiel,
  onAddParty,
  onPartyClick,
  currentTheme,
  isSaving = false,
}: Props) {
  const [selectedMittelspiel, setSelectedMittelspiel] = useState<Opening | null>(null)
  const [query, setQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [usePrefix, setUsePrefix] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [view, setView] = useState<"carousel" | "parties">("carousel")
  const [previewOpen, setPreviewOpen] = useState(false)
  const currentPlaybackRate = useRef(1)
  // Web Animations API refs для плавного управления скоростью карусели
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const mobCarouselRef = useRef<HTMLDivElement | null>(null)
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
    currentPlaybackRate.current = targetRate
    if (rateRafRef.current) cancelAnimationFrame(rateRafRef.current)

    const anims: Animation[] = []
    if (carouselRef.current) anims.push(...carouselRef.current.getAnimations())
    if (mobCarouselRef.current) anims.push(...mobCarouselRef.current.getAnimations())
    cardRefsMap.current.forEach((el) => anims.push(...el.getAnimations()))
    if (anims.length === 0) return

    const startRates = anims.map((a) => a.playbackRate ?? 1)
    const startTime = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      
      const currentAnims: Animation[] = []
      if (carouselRef.current) currentAnims.push(...carouselRef.current.getAnimations())
      if (mobCarouselRef.current) currentAnims.push(...mobCarouselRef.current.getAnimations())
      cardRefsMap.current.forEach((el) => currentAnims.push(...el.getAnimations()))

      currentAnims.forEach((a, i) => {
        const start = startRates[i] ?? 1
        a.updatePlaybackRate(start + (targetRate - start) * ease)
      })

      if (t < 1) {
        rateRafRef.current = requestAnimationFrame(tick)
      }
    }

    rateRafRef.current = requestAnimationFrame(tick)
  }, [])

  // Синхронизация анимаций только при изменении карусели, не при каждом рендере
  // Убран пустой dep array — теперь не вызывает layout thrashing при каждом рендере
  useEffect(() => {
    const syncRate = () => {
      const anims: Animation[] = []
      if (carouselRef.current) anims.push(...carouselRef.current.getAnimations())
      if (mobCarouselRef.current) anims.push(...mobCarouselRef.current.getAnimations())
      cardRefsMap.current.forEach((el) => anims.push(...el.getAnimations()))
      anims.forEach(a => {
        if (a.playbackRate !== currentPlaybackRate.current) {
          a.updatePlaybackRate(currentPlaybackRate.current)
        }
      })
    }
    // Запускаем через rAF — не блокируем главный поток в момент рендера
    const id = requestAnimationFrame(syncRate)
    return () => cancelAnimationFrame(id)
  }, [mittelspiels])

  const handleMittelspielClick = (m: Opening) => {
    setSelectedMittelspiel(m)
    if (rateTimerRef.current) clearTimeout(rateTimerRef.current)
    // Плавно тормозим за 1s до ~0
    animateRate(0.02, 1000)
    // Через 2.5s плавно разгоняем обратно до 1
    rateTimerRef.current = setTimeout(() => animateRate(1, 1500), 2500)
  }

  // Функции для расчета позиций в карусели
  const getPos = (index: number, total: number) => {
    if (total === 0) return { x: 0, y: 0 }
    // Равномерное распределение: -90° чтобы первая карточка была сверху
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: Math.cos(angle) * ORBIT_RADIUS,
      y: Math.sin(angle) * ORBIT_RADIUS,
    }
  }

  const getMobPos = (index: number, total: number) => {
    if (total === 0) return { x: 0, y: 0 }
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: Math.cos(angle) * MOB_ORBIT,
      y: Math.sin(angle) * MOB_ORBIT,
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
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-border bg-card/50 px-3 sm:px-6 backdrop-blur-md z-50">
        <Button variant="ghost" onClick={() => startTransition(onBack)} className="hidden sm:flex absolute left-3 gap-1 sm:gap-2 rounded-xl font-bold uppercase tracking-wide sm:tracking-widest px-2 sm:px-4 text-[10px] sm:text-xs sm:text-sm">
          <ArrowLeft className="h-5 w-5" />
          Назад
        </Button>
        <h1 className="text-[20px] sm:text-xl md:text-2xl font-black tracking-[0.2em] text-primary text-center px-16">
          {opening.name.toUpperCase()}
        </h1>
        
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ЦЕНТРАЛЬНАЯ ОБЛАСТЬ */}
        <main className="relative flex flex-1 flex-col sm:items-center sm:justify-center overflow-hidden bg-accent/5">

          {view === "carousel" ? (
            <>
              {/* Карточка "Полноценные партии" — в правом верхнем углу */}
              <div className="absolute right-4 top-4 z-40 sm:right-8 sm:top-8">
                <div
                  onClick={() => setView("parties")}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-card/50 p-3 text-center backdrop-blur-md transition hover:border-primary/50 hover:bg-card/80 shadow-lg"
                  style={accentGlow}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:scale-110">
                    <Trophy className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider">Партии</h3>
                  <p className="text-[8px] text-muted-foreground">{parties.length} шт.</p>
                </div>
              </div>

              {/* Кнопки "Добавить" — только на десктопе */}
              <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto hidden sm:flex gap-3">
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="h-8 sm:h-10 rounded-full px-3 sm:px-6 text-[10px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-widest"
                  style={accentGlow}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Добавить миттельшпиль
                </Button>
              </div>

          {/* Карусель — только на десктопе */}
          <div
            className="relative hidden sm:flex items-center justify-center"
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


          {/* Мобильная круговая карусель — только на мобильном */}
          <div className="flex flex-1 flex-col items-center overflow-hidden sm:hidden">
            {/* Поиск */}
            <div className="shrink-0 w-full px-4 pt-1 pb-2" style={{ touchAction: "auto" }}>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск миттельшпилей..."
                  className="h-8 w-full rounded-full border border-border bg-card pl-9 pr-4 text-[11px] outline-none transition focus:border-primary"
                  style={{ touchAction: "auto" }}
                />
              </div>
            </div>

            {/* Карусель — центрирована, вписана в экран */}
            <div className="flex flex-1 items-center justify-center overflow-hidden w-full">
              <div
                style={{
                  width: MOB_CAROUSEL_SIZE,
                  height: MOB_CAROUSEL_SIZE,
                  position: "relative",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                {/* Вращающийся контейнер */}
                <div
                  ref={mobCarouselRef}
                  className="absolute inset-0"
                  style={{ animation: "carousel-spin 20s linear infinite" }}
                >
                  {/* SVG линии */}
                  <svg className="absolute inset-0 pointer-events-none" width={MOB_CAROUSEL_SIZE} height={MOB_CAROUSEL_SIZE}>
                    {mittelspiels.map((m, i) => {
                      const pos = getMobPos(i, mittelspiels.length)
                      const cx = MOB_CAROUSEL_SIZE / 2
                      const cy = MOB_CAROUSEL_SIZE / 2
                      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y) || 1
                      const ux = pos.x / dist
                      const uy = pos.y / dist
                      const visible = filteredIds.has(m.id)
                      return (
                        <line
                          key={m.id}
                          x1={cx + ux * (MOB_CENTER_W / 2)}
                          y1={cy + uy * (MOB_CENTER_W / 2)}
                          x2={cx + pos.x - ux * (MOB_MITTEL_W / 2)}
                          y2={cy + pos.y - uy * (MOB_MITTEL_W / 2)}
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth="1"
                          strokeDasharray="4 3"
                          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
                        />
                      )
                    })}
                  </svg>

                  {/* Карточки миттельшпилей */}
                  {mittelspiels.map((m, i) => {
                    const pos = getMobPos(i, mittelspiels.length)
                    const isSelected = selectedMittelspiel?.id === m.id
                    const visible = filteredIds.has(m.id)
                    return (
                      <div
                        key={m.id}
                        className="absolute"
                        style={{
                          left: "50%", top: "50%",
                          transform: `translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%))`,
                          width: MOB_CARD_RENDER_W,
                          zIndex: 10,
                          opacity: visible ? 1 : 0,
                          pointerEvents: visible ? "auto" : "none",
                          transition: "opacity 0.3s",
                          overflow: "visible",
                        }}
                      >
                        {/* Внешний div — только контр-вращение */}
                        <div
                          ref={(el) => { if (el) cardRefsMap.current.set(m.id, el); else cardRefsMap.current.delete(m.id) }}
                          style={{
                            animation: `carousel-spin-reverse 20s linear ${getCardDelay(m.id)}ms infinite`,
                            willChange: "transform",
                            transformOrigin: "center center",
                            width: MOB_CARD_RENDER_W,
                          }}
                        >
                          {/* Внутренний div — только масштаб */}
                          <div
                            style={{
                              transform: `scale(${MOB_MITTEL_SCALE})`,
                              transformOrigin: "center center",
                              width: MOB_CARD_RENDER_W,
                              ...(isSelected ? accentGlow : {}),
                            }}
                            className="mittel-card-wrapper"
                          >
                            <OpeningCard
                              opening={m}
                              onDelete={async () => setDeleteId(m.id)}
                              onEdit={onEdit}
                              onStudy={() => handleMittelspielClick(m)}
                              theme={currentTheme}
                              isSaving={isSaving}
                              isSelected={isSelected}
                              compact hideActions
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                </div>
              </div>
            </div>
          </div>

              {/* Поиск снизу — только на десктопе */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-6 hidden sm:block">
                <div className="group relative w-full">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск миттельшпилей..."
                    className="h-10 w-full rounded-full border border-border bg-card pl-11 pr-5 text-[11px] sm:text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
                    style={accentGlow}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col bg-background/30 backdrop-blur-sm">
              <div className="flex shrink-0 items-center justify-between border-b border-border p-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView("carousel")}
                    className="rounded-full hover:bg-primary/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="text-sm sm:text-lg font-black uppercase tracking-wider text-primary">Полноценные партии</h2>
                    <p className="text-[10px] text-muted-foreground">{parties.length} шт.</p>
                  </div>
                </div>
                <Button
                  onClick={onAddParty}
                  className="rounded-full font-bold uppercase tracking-widest shadow-lg h-9 sm:h-11 px-4 sm:px-8 text-[10px] sm:text-sm"
                  style={accentGlow}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить партию
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                <FullPartiesSection
                  parties={parties}
                  opening={opening}
                  onPartyClick={onPartyClick}
                  onAddParty={onAddParty}
                  currentTheme={currentTheme}
                  isSaving={isSaving}
                />
              </div>
            </div>
          )}
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ — с триггером на границе */}
        <div className="relative hidden md:flex shrink-0">
          {/* Треугольник-триггер — всегда виден, сидит на левой границе панели */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-40 flex h-10 w-4 items-center justify-center group"
            title={panelOpen ? "Скрыть панель" : "Показать панель"}
          >
            <svg
              width="16" height="40" viewBox="0 0 16 40"
              className="transition-all duration-300 drop-shadow-lg"
            >
              {/* Фон-таб */}
              <path
                d={panelOpen
                  ? "M16,0 Q4,8 2,20 Q4,32 16,40 Z"
                  : "M0,0 Q12,8 14,20 Q12,32 0,40 Z"}
                className="fill-card stroke-border group-hover:fill-primary/20 transition-all duration-300"
                strokeWidth="1"
              />
              {/* Стрелка */}
              <polyline
                points={panelOpen ? "10,14 5,20 10,26" : "6,14 11,20 6,26"}
                className="stroke-primary group-hover:stroke-primary transition-colors duration-300"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
          <aside className={`flex flex-col border-l border-border bg-card/20 transition-all duration-300 overflow-hidden ${panelOpen ? "w-96" : "w-0 border-l-0"}`}>
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
                <p className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">
                  {isMainOpening ? "Основной дебют" : "Миттельшпиль"}
                </p>
              </div>
              <h2 className="text-[10px] sm:text-xs sm:text-lg font-black truncate tracking-tight">{activeOpening.name}</h2>
              <p className="text-[11px] sm:text-sm leading-relaxed text-muted-foreground pt-1">
                {activeOpening.description || "Нет описания"}
              </p>
              <div className="flex gap-4 pt-2">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Ходов</span>
                  <span className="text-[10px] sm:text-xs sm:text-base font-black text-primary">{activeParsed.moveCount}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Сторона</span>
                  <span className="text-[10px] sm:text-xs sm:text-base font-black text-primary uppercase">
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
              className="w-full h-14 gap-3 rounded-2xl text-[10px] sm:text-xs sm:text-base font-black uppercase tracking-wide sm:tracking-widest shadow-lg shadow-primary/20"
              style={accentGlow}
            >
              <BookOpen className="h-5 w-5" />
              Режим изучения
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(activeOpening)}
              className="w-full h-12 rounded-2xl font-bold uppercase tracking-wide sm:tracking-widest"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
            variant="ghost"
            onClick={() => setDeleteId(activeOpening.id)}
            className="w-full h-12 rounded-2xl font-bold uppercase tracking-wide sm:tracking-widest text-error hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        </div>
        </aside>
      </div>

      {/* Мобильная нижняя панель действий — вне overflow-hidden, прижата к низу */}
      <div className="flex shrink-0 items-center justify-around border-t border-border bg-card/80 px-4 py-2 backdrop-blur-md sm:hidden" style={{ touchAction: "auto" }}>
        <button
          onClick={() => startTransition(onBack)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Назад</span>
        </button>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <Plus className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Добавить</span>
        </button>
        <button
          onClick={() => onStudy(activeOpening)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 transition"
          style={{ color: s.accent }}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Изучать</span>
        </button>
        <button
          onClick={() => onEdit(activeOpening)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <Pencil className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Редакт.</span>
        </button>
        <button
          onClick={() => setDeleteId(activeOpening.id)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-error"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Удалить</span>
        </button>
      </div>

      {/* Модалки */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="rounded-3xl border-border bg-card p-0 overflow-hidden dialog-wide flex flex-col" style={accentGlow}>
          {/* Header — fixed */}
          <div className="px-8 py-6 border-b border-border text-center shrink-0">
            <DialogTitle className="text-[10px] sm:text-xs sm:text-base sm:text-2xl font-black uppercase tracking-normal sm:tracking-wider text-center">Добавить миттельшпиль</DialogTitle>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-[11px] sm:text-sm text-muted-foreground">Начать с позиции дебюта</span>
              <button
                type="button"
                onClick={() => setUsePrefix(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${usePrefix ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${usePrefix ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {usePrefix && (
              <p className="mt-2 text-[10px] sm:text-xs font-mono text-primary/80">{opening.pgn}</p>
            )}
          </div>
          {/* Body — scrollable */}
          <div className="p-6">
            <AddOpeningForm
              onSave={async (o) => {
                const err = await onAddMittelspiel(o)
                if (!err) setAddDialogOpen(false)
                return err
              }}
              parentPgn={usePrefix ? opening.pgn : undefined}
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
            <DialogTitle className="flex items-center gap-2 text-[11px] sm:text-sm sm:text-xl font-bold">
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
        .mittel-card-wrapper span[class*="text-[10px] sm:text-xs"],
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
    </div>
  )
}