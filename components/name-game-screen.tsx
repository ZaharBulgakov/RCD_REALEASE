"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { CheckCircle2, LogOut, Type, XCircle } from "lucide-react"
import type { Opening, SessionUnit } from "@/lib/openings"
import { parsePgn } from "@/lib/openings"
import { BoardWithCoords } from "./board-with-coords"
import { ChessTheme } from "@/lib/themes"

type Props = {
  session: SessionUnit[]
  color: "white" | "black" | "random"
  onExit: () => void
  onFinish: (summary: {
    results: Array<{
      unit: SessionUnit
      status: "won" | "failed"
      seconds: number
    }>
    totalSeconds: number
    isRandomColor?: boolean
  }) => void
  scoringEnabled: boolean
  theme: ChessTheme
}

function normalizeName(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase()
}

function openingOfUnit(u: SessionUnit): Opening {
  // In "names" mode the session is expected to be built from singles.
  // If a pair ever appears, we use the long variant as the "complete" opening.
  return u.kind === "single" ? u.opening : u.long
}

export function NameGameScreen({ session, color, onExit, onFinish, theme }: Props) {
  const [unitIndex, setUnitIndex] = useState(0)
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white")
  const unitIndexRef = useRef(0)
  const unitStartMsRef = useRef<number>(Date.now())
  const completedUnitRef = useRef<boolean>(false)
  const resultsRef = useRef<
    Array<{
      unit: SessionUnit
      status: "won" | "failed"
      seconds: number
    }>
  >([])

  const unit = session[unitIndex]
  const opening = useMemo(() => (unit ? openingOfUnit(unit) : null), [unit])
  const parsed = useMemo(() => (opening ? parsePgn(opening.pgn) : null), [opening])

  const finalFen = useMemo(() => {
    if (!parsed?.valid) return new Chess().fen()
    return parsed.finalFen
  }, [parsed])

  const [answer, setAnswer] = useState("")
  const [status, setStatus] = useState<"playing" | "won" | "failed">("playing")
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    unitIndexRef.current = unitIndex
  }, [unitIndex])

  useEffect(() => {
    // reset per unit
    setAnswer("")
    setStatus("playing")
    setToast(null)
    completedUnitRef.current = false
    unitStartMsRef.current = Date.now()
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)

    // Determine player color for this unit.
    const currentUnitPlayerColor = color === "random" ? (Math.random() < 0.5 ? "white" : "black") : color
    setPlayerColor(currentUnitPlayerColor)
  }, [unitIndex, color])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const progressLabel = `Дебют ${unitIndex + 1} из ${session.length}`

  const showToast = useCallback((kind: "success" | "error", text: string | React.ReactNode) => {
    setToast({ kind, text: text as any })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const commitUnitResult = useCallback(
    (nextStatus: "won" | "failed") => {
      if (completedUnitRef.current) return
      completedUnitRef.current = true
      const u = session[unitIndexRef.current]
      const seconds = Math.max(0.05, (Date.now() - unitStartMsRef.current) / 1000)
      resultsRef.current = [...resultsRef.current, { unit: u, status: nextStatus, seconds }]
    },
    [session],
  )

  const advance = useCallback(
    (delayMs = 3500) => {
      window.setTimeout(() => {
        const nextIdx = unitIndexRef.current + 1
        if (nextIdx < session.length) {
          setUnitIndex(nextIdx)
        } else {
          const totalSeconds = resultsRef.current.reduce((acc, r) => acc + r.seconds, 0)
          onFinish({ results: resultsRef.current, totalSeconds, isRandomColor: color === "random" })
        }
      }, delayMs)
    },
    [onFinish, session.length],
  )

  const checkAnswer = useCallback(() => {
    if (!opening) return
    if (status !== "playing") return
    const ok = normalizeName(answer) === normalizeName(opening.name)
    if (ok) {
      setStatus("won")
      commitUnitResult("won")
      showToast("success", "Верно! Следующий дебют...")
      advance(1500)
      return
    }
    setStatus("failed")
    commitUnitResult("failed")
    
    const toastContent = (
      <span>
        Неверно. Правильный ответ: <span className="font-bold underline decoration-2 underline-offset-2">{opening.name}</span>. Переходим дальше...
      </span>
    )
    
    showToast("error", toastContent)
    advance(3500)
  }, [advance, answer, commitUnitResult, opening, showToast, status])

  if (!unit || !opening || !parsed) return null

  return (
    <div className="screen-in flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {progressLabel}
            </span>
            <h1 className="text-xl font-semibold text-pretty md:text-2xl">
              Усложненный режим (Названия)
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <Type className="h-3.5 w-3.5" />
              Угадайте дебют
            </span>
            <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              Играете за {playerColor === "white" ? "белых" : "чёрных"}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Позиция: конец линии
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_minmax(320px,380px)]">
          <aside className="order-2 min-w-0 lg:order-1">
            <div className="sticky top-6 flex min-w-[300px] flex-col gap-3 rounded-xl border border-border bg-card px-6 py-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Введите название дебюта
              </h2>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={status !== "playing"}
                placeholder="Например: Итальянская партия"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition
                  focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    checkAnswer()
                  }
                }}
              />
              <button
                type="button"
                onClick={checkAnswer}
                disabled={status !== "playing" || !answer.trim()}
                className="h-10 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition
                  hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Проверить
              </button>
              <p className="text-xs text-muted-foreground">
                Лишние пробелы и регистр букв не влияют на проверку.
              </p>
            </div>
          </aside>

          <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
            <div className="screen-in relative w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/30" style={{ boxShadow: `0 0 0 0px color-mix(in srgb, var(--primary) 100%%, transparent), 0 0 12px 2px ${theme.systemDesign?.cardGlow ?? "transparent"}` }}>
              <BoardWithCoords
                orientation={playerColor}
                boardLight={theme.systemDesign?.boardLight}
                boardDark={theme.systemDesign?.boardDark}
                options={{
                  id: `name-game-${opening.id}`,
                  position: finalFen,
                  allowDragging: false,
                  animationDurationInMs: 0,
                  showAnimations: false,
                  boardStyle: { width: "100%", height: "100%" },
                }}
              />
            </div>

            <div className="min-h-10">
              {toast && (
                <div
                  role="status"
                  className={`screen-in inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
                    toast.kind === "success"
                      ? "border-success/40 bg-success/15 text-success"
                      : "border-error/40 bg-error/15 text-error"
                  }`}
                >
                  {toast.kind === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {toast.text}
                </div>
              )}
            </div>
          </div>

          <aside className="order-3 min-w-0">
            <div className="sticky top-6 flex min-w-[300px] flex-col gap-4 rounded-xl border border-border bg-card px-6 py-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Описание (после конца линии)
              </h2>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-card-foreground">
                {opening.description || "Для этого дебюта не указано описание."}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 border-t border-border/60 pt-2">
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {parsed.fullMoveCount} полных ходов
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {parsed.moves.length} полуходов
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="sticky bottom-0 left-0 z-10 mt-auto p-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-full border border-error/60 bg-error px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition
            hover:brightness-110"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  )
}

