"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { getStyles } from "@/lib/styles"
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  CheckCircle2,
  XCircle,
  Link2,
  ArrowRight,
  RotateCcw,
} from "lucide-react"
import type { Opening, SessionUnit, ParsedPgn } from "@/lib/openings"
import { parsePgn } from "@/lib/openings"
import { BoardWithCoords } from "./board-with-coords"
import { ChessTheme } from "@/lib/themes"
import { chessSounds } from "@/lib/sounds"

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

type Status = "playing" | "won" | "failed"
type Phase = "single" | "short" | "long"

function openingOfPhase(unit: SessionUnit, phase: Phase): Opening {
  if (unit.kind === "single") return unit.opening
  return phase === "short" ? unit.short : unit.long
}

function initialPhaseFor(unit: SessionUnit): Phase {
  return unit.kind === "pair" ? "short" : "single"
}

export function GameScreen({ session, color, onExit, onFinish, scoringEnabled, theme }: Props) {
  const s = getStyles(theme)
  const [unitIndex, setUnitIndex] = useState(0)
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white")
  const [phase, setPhase] = useState<Phase>(() => initialPhaseFor(session[0]))

  const unit = session[unitIndex]
  const currentOpening = useMemo(
    () => openingOfPhase(unit, phase),
    [unit, phase],
  )
  const parsed = useMemo(
    () => parsePgn(currentOpening.pgn),
    [currentOpening],
  )

  // Refs that async callbacks need so they don't see stale values.
  const chessRef = useRef<Chess>(new Chess())
  const moveIdxRef = useRef<number>(0)
  const statusRef = useRef<Status>("playing")
  const phaseRef = useRef<Phase>(phase)
  const parsedRef = useRef<ParsedPgn>(parsed)
  const unitIndexRef = useRef<number>(unitIndex)
  const unitStartMsRef = useRef<number>(Date.now())
  const resultsRef = useRef<
    Array<{
      unit: SessionUnit
      status: "won" | "failed"
      seconds: number
    }>
  >([])
  const completedUnitRef = useRef<boolean>(false)

  const [fen, setFen] = useState<string>(() => new Chess().fen())
  const [moveIdx, setMoveIdx] = useState(0)
  const [status, setStatus] = useState<Status>("playing")
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null)
  const [pgnOpen, setPgnOpen] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)
  const [transitionKey, setTransitionKey] = useState(0)
  const [promotionData, setPromotionData] = useState<{
    from: string
    to: string
    color: "w" | "b"
  } | null>(null)
  const [pairTransition, setPairTransition] = useState<{
    from: string
    to: string
  } | null>(null)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const systemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pairBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const boardContainerRef = useRef<HTMLDivElement | null>(null)
  const [boardHeight, setBoardHeight] = useState<number>(0)

  // Keep refs in sync with state.
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    parsedRef.current = parsed
  }, [parsed])
  useEffect(() => {
    unitIndexRef.current = unitIndex
  }, [unitIndex])

  // Observe board height so the PGN panel matches it.
  useEffect(() => {
    const el = boardContainerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 0) setBoardHeight(h)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function updateMoveIdx(v: number) {
    moveIdxRef.current = v
    setMoveIdx(v)
  }
  function updateStatus(s: Status) {
    statusRef.current = s
    setStatus(s)
  }

  // Reset board whenever the UNIT changes. Phase changes within a
  // unit (short → long) preserve the board state.
  useEffect(() => {
    const u = session[unitIndex]
    if (!u) return

    // Determine player color for this unit.
    // Приоритет: leadingSide дебюта → color сессии → случайный
    const opening = u.kind === "single" ? u.opening : u.short
    const leadingSide = opening.leadingSide ?? "random"
    const effectiveColor = leadingSide !== "random" ? leadingSide : color
    const currentUnitPlayerColor = effectiveColor === "random"
      ? (Math.random() < 0.5 ? "white" : "black")
      : effectiveColor
    console.log("[GameScreen] opening:", opening.name, "| leadingSide:", opening.leadingSide, "| effectiveColor:", effectiveColor, "| playerColor:", currentUnitPlayerColor)
    setPlayerColor(currentUnitPlayerColor)

    const fresh = new Chess()
    chessRef.current = fresh
    setFen(fresh.fen())
    updateMoveIdx(0)
    updateStatus("playing")
    setToast(null)
    setPgnOpen(false)
    setPairTransition(null)
    setTransitionKey((k) => k + 1)

    const startPhase = initialPhaseFor(u)
    phaseRef.current = startPhase
    setPhase(startPhase)

    const startOpening = openingOfPhase(u, startPhase)
    const startParsed = parsePgn(startOpening.pgn)
    parsedRef.current = startParsed
    unitStartMsRef.current = Date.now()
    completedUnitRef.current = false

    if (firstMoveTimerRef.current) clearTimeout(firstMoveTimerRef.current)
    if (systemTimerRef.current) clearTimeout(systemTimerRef.current)
    if (pairBannerTimerRef.current) clearTimeout(pairBannerTimerRef.current)

    // System plays the first move if the user is black.
    if (currentUnitPlayerColor === "black" && startParsed.moves.length > 0) {
      firstMoveTimerRef.current = setTimeout(() => {
        try {
          chessRef.current.move(startParsed.moves[0], { strict: false })
          setFen(chessRef.current.fen())
          updateMoveIdx(1)
          if (1 >= startParsed.moves.length) handlePhaseComplete()
        } catch {
          // ignore
        }
      }, 450)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitIndex, color])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
      if (systemTimerRef.current) clearTimeout(systemTimerRef.current)
      if (firstMoveTimerRef.current) clearTimeout(firstMoveTimerRef.current)
      if (pairBannerTimerRef.current) clearTimeout(pairBannerTimerRef.current)
    }
  }, [])

    useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

function showToast(kind: "success" | "error", text: string | React.ReactNode) {
  setToast({ kind, text: text as any })
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  if (kind === "success") {
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }
}

  function scheduleAdvance(delayMs = 3500) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      const nextIdx = unitIndexRef.current + 1
      if (nextIdx < session.length) {
        setUnitIndex(nextIdx)
      } else {
        const totalSeconds = resultsRef.current.reduce((acc, r) => acc + r.seconds, 0)
        onFinish({ results: resultsRef.current, totalSeconds, isRandomColor: color === "random" })
      }
    }, delayMs)
  }

  function commitUnitResult(nextStatus: "won" | "failed") {
    if (completedUnitRef.current) return
    completedUnitRef.current = true
    const u = session[unitIndexRef.current]
    const seconds = Math.max(0.05, (Date.now() - unitStartMsRef.current) / 1000)
    resultsRef.current = [...resultsRef.current, { unit: u, status: nextStatus, seconds }]
  }

  function finishWin() {
    updateStatus("won")
    commitUnitResult("won")
    showToast("success", "Дебют пройден! Следующий дебют...")
    scheduleAdvance(1500)
  }

  function finishFail(expected?: string) {
  updateStatus("failed")
  commitUnitResult("failed")
  
  const toastContent = expected ? (
    <span>
      Неправильный ход. Ожидался: <span className="font-bold underline decoration-2 underline-offset-2">{expected}</span>
    </span>
  ) : (
    "Неправильный ход."
  )

  showToast("error", toastContent)
  // убрали scheduleAdvance
}

function handleUndoMove() {
  const chess = chessRef.current
  chess.undo()
  setFen(chess.fen())
  updateStatus("playing")
  setToast(null)
}

function handleContinue() {
  scheduleAdvance(0)
}

  // Called when the current phase's last PGN move has just been played.
  function handlePhaseComplete() {
    const u = session[unitIndexRef.current]
    if (u && u.kind === "pair" && phaseRef.current === "short") {
      // Transition to the long variant. Board and moveIdx stay — the
      // long PGN is a strict superset of the short one, so play simply
      // continues with the remaining moves.
      const longParsed = parsePgn(u.long.pgn)
      phaseRef.current = "long"
      parsedRef.current = longParsed
      setPhase("long")
      setPairTransition({ from: u.short.name, to: u.long.name })
      if (pairBannerTimerRef.current) clearTimeout(pairBannerTimerRef.current)
      pairBannerTimerRef.current = setTimeout(() => setPairTransition(null), 3200)

      // If the next move belongs to the system, play it after the
      // banner has had a moment to appear.
      const afterTurn = chessRef.current.turn()
        const systemTurn =
          (afterTurn === "w" && color === "black") ||
          (afterTurn === "b" && color === "white")

      if (systemTurn && moveIdxRef.current < longParsed.moves.length) {
              if (systemTimerRef.current) clearTimeout(systemTimerRef.current)
              systemTimerRef.current = setTimeout(() => {
                if (statusRef.current !== "playing") return
                const idx = moveIdxRef.current
                const systemSan = longParsed.moves[idx]
                try {
                  chessRef.current.move(systemSan, { strict: false })
                  setFen(chessRef.current.fen())
                  chessSounds.playMoveSound()

                  // Check for threefold repetition
                  if (chessRef.current.isThreefoldRepetition()) {
                    finishFail("Ничья (повторение ходов)")
                    return
                  }

                  const afterIdx = idx + 1
                  updateMoveIdx(afterIdx)
                  if (afterIdx >= longParsed.moves.length) handlePhaseComplete()
                } catch {
                  finishFail(systemSan)
                }
              }, 900)
            }
      return
    }

    // Single unit, or long phase finished — whole unit is done.
    finishWin()
  }

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string
      targetSquare: string | null
    }): boolean => {
      if (!targetSquare) return false
      if (statusRef.current !== "playing") return false
      if (promotionData) return false // Block drops while selecting promotion

      const chess = chessRef.current
      const activeParsed = parsedRef.current
      const currentIdx = moveIdxRef.current
      const expectedSan = activeParsed.moves[currentIdx]
      if (!expectedSan) return false

      const turn = chess.turn()
      const userTurn =
        (turn === "w" && playerColor === "white") || (turn === "b" && playerColor === "black")
      if (!userTurn) return false

      // Check for promotion
      const piece = chess.get(sourceSquare as any)
      const isPromotion = 
        piece?.type === "p" && 
        ((turn === "w" && targetSquare[1] === "8") || (turn === "b" && targetSquare[1] === "1"))

      if (isPromotion) {
        setPromotionData({ from: sourceSquare, to: targetSquare, color: turn })
        return true
      }

      // Validate on a clone to get the canonical SAN.
      const test = new Chess(chess.fen())
      let attempted
      try {
        attempted = test.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // default for test
        })
      } catch {
        return false
      }
      if (!attempted) return false
      
      if (attempted.san !== expectedSan) {
        // Apply the wrong move so the user sees it, then fail the unit.
        try {
          chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" })
          setFen(chess.fen())
        } catch {
          /* noop */
        }
        finishFail(expectedSan)
        return true
      }
      
      // Correct move.
      try {
        chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" })
      } catch {
        return false
      }
      setFen(chess.fen())
      chessSounds.playMoveSound()
      const nextIdx = currentIdx + 1
      updateMoveIdx(nextIdx)

      if (nextIdx >= activeParsed.moves.length) {
        handlePhaseComplete()
        return true
      }

      const afterTurn = chess.turn()
      const systemTurn =
        (afterTurn === "w" && playerColor === "black") ||
        (afterTurn === "b" && playerColor === "white")

      if (systemTurn) {
        if (systemTimerRef.current) clearTimeout(systemTimerRef.current)
        systemTimerRef.current = setTimeout(() => {
          if (statusRef.current !== "playing") return
          const p = parsedRef.current
          const idx = moveIdxRef.current
          const systemSan = p.moves[idx]
          if (!systemSan) return
          try {
            chess.move(systemSan, { strict: false })
            setFen(chess.fen())
            chessSounds.playMoveSound()

            // Check for threefold repetition
            if (chess.isThreefoldRepetition()) {
              finishFail("Ничья (повторение ходов)")
              return
            }

            const afterIdx = idx + 1
            updateMoveIdx(afterIdx)
            if (afterIdx >= p.moves.length) handlePhaseComplete()
          } catch {
            finishFail(systemSan)
          }
        }, 320)
      }
      return true
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [playerColor, setFen, updateMoveIdx, setPromotionData, finishFail, handlePhaseComplete, promotionData],
  )

  function doExit() {
    setExitConfirm(false)
    onExit()
  }

  function handlePromotionSelect(piece: "q" | "r" | "b" | "n") {
    if (!promotionData) return
    const { from, to } = promotionData
    setPromotionData(null)

    const chess = chessRef.current
    const activeParsed = parsedRef.current
    const currentIdx = moveIdxRef.current
    const expectedSan = activeParsed.moves[currentIdx]

    // Validate on a clone
    const test = new Chess(chess.fen())
    let attempted
    try {
      attempted = test.move({ from, to, promotion: piece })
    } catch {
      return
    }

    if (!attempted) return

    if (attempted.san !== expectedSan) {
      try {
        chess.move({ from, to, promotion: piece })
        setFen(chess.fen())
      } catch { /* noop */ }
      finishFail(expectedSan)
      return
    }

    // Correct move
    try {
      chess.move({ from, to, promotion: piece })
      setFen(chess.fen())
      chessSounds.playMoveSound()

      // Check for threefold repetition
      if (chess.isThreefoldRepetition()) {
        finishFail("Ничья (повторение ходов)")
        return
      }

      const nextIdx = currentIdx + 1
      updateMoveIdx(nextIdx)

      if (nextIdx >= activeParsed.moves.length) {
        handlePhaseComplete()
        return
      }

      // System turn
      const afterTurn = chess.turn()
      const systemTurn =
        (afterTurn === "w" && color === "black") ||
        (afterTurn === "b" && color === "white")

      if (systemTurn) {
        if (systemTimerRef.current) clearTimeout(systemTimerRef.current)
        systemTimerRef.current = setTimeout(() => {
          if (statusRef.current !== "playing") return
          const p = parsedRef.current
          const idx = moveIdxRef.current
          const systemSan = p.moves[idx]
          if (!systemSan) return
          try {
            chess.move(systemSan, { strict: false })
            setFen(chess.fen())
            chessSounds.playMoveSound()
            const afterIdx = idx + 1
            updateMoveIdx(afterIdx)
            if (afterIdx >= p.moves.length) handlePhaseComplete()
          } catch {
            finishFail(systemSan)
          }
        }, 320)
      }
    } catch {
      /* noop */
    }
  }

  if (!unit) return null

  const progressLabel = `Дебют ${unitIndex + 1} из ${session.length}`
  const displayMoveNum = Math.min(moveIdx, parsed.moves.length)
  const isPair = unit.kind === "pair"
  const pairPart =
    isPair && phase === "short" ? "1/2" : isPair && phase === "long" ? "2/2" : null

  return (
    <div className="screen-in flex h-dvh flex-col bg-background">
      {/* Top header - title only, centered */}
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-center px-4 py-3">
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {progressLabel}
            </span>
            <h1 className="text-xl font-semibold text-pretty md:text-2xl">
              {currentOpening.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Main body */}
      <main className="relative flex min-h-0 flex-1 items-stretch">

        {/* LEFT DRAWER: PGN */}
        <div className="relative flex items-stretch z-20">
          {/* Panel */}
          <div
            className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              width: pgnOpen ? "260px" : "0px",
              opacity: pgnOpen ? 1 : 0,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "color-mix(in srgb, var(--card) 75%, transparent)",
              borderRight: pgnOpen ? "1px solid var(--border)" : "none",
            }}
          >
            <div
              className="shrink-0 grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-border px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "var(--muted)" }}
            >
              <span>№</span>
              <span>Бел</span>
              <span>Чёр</span>
            </div>
            <div className="flex-1 overflow-y-auto min-w-[260px]">
              {parsed.moves.length === 0 ? (
                <div className="p-4 font-mono text-xs text-muted-foreground">PGN пуст.</div>
              ) : (
                <ol className="divide-y divide-border/60">
                  {Array.from({ length: Math.ceil(parsed.moves.length / 2) }).map((_, row) => {
                    const wIdx = row * 2
                    const bIdx = row * 2 + 1
                    const whiteMove = parsed.moves[wIdx]
                    const blackMove = parsed.moves[bIdx]
                    const whitePlayed = wIdx < moveIdx
                    const blackPlayed = bIdx < moveIdx
                    const whiteIsCurrent = wIdx === moveIdx && status === "playing"
                    const blackIsCurrent = bIdx === moveIdx && status === "playing"
                    return (
                      <li key={row} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 px-3 py-2 font-mono tabular-nums">
                        <span className="text-muted-foreground text-xs">{row + 1}.</span>
                        <span className={`truncate text-xs ${whitePlayed ? "font-semibold text-accent" : whiteIsCurrent ? "-mx-1 rounded bg-accent/15 px-1 text-accent" : "text-card-foreground"}`}>
                          {whiteMove ?? ""}
                        </span>
                        <span className={`truncate text-xs ${blackPlayed ? "font-semibold text-accent" : blackIsCurrent ? "-mx-1 rounded bg-accent/15 px-1 text-accent" : blackMove ? "text-card-foreground" : "text-muted-foreground/60"}`}>
                          {blackMove ?? "—"}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>
          {/* Tab */}
          <button
            type="button"
            onClick={() => setPgnOpen(o => !o)}
            className="absolute top-1/2 -translate-y-1/2 -right-8 z-30 flex h-16 w-8 flex-col items-center justify-center gap-1 rounded-r-xl border border-l-0 border-border text-muted-foreground transition hover:text-foreground"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "color-mix(in srgb, var(--card) 75%, transparent)",
            }}
            aria-label="Ходы"
          >
            {pgnOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ writingMode: "vertical-rl" }}>PGN</span>
          </button>
        </div>

        {/* CENTER: Board - flex-1 spacer + absolute board centered in main */}
        <div className="relative flex flex-1 min-h-0">
          {/* Badges - absolute to main, never shift horizontally */}
          <div className="absolute top-3 left-0 right-0 z-10 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
              {isPair && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent backdrop-blur-sm">
                  <Link2 className="h-3.5 w-3.5" />
                  Пара • Часть {pairPart}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm">
                Играете за {color === "white" ? "белых" : color === "black" ? "чёрных" : "случайный цвет"}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted/80 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                Ход {displayMoveNum} / {parsed.moves.length}
              </span>
            </div>
          </div>
          {/* Board - absolute centered in this flex-1 cell */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            key={transitionKey}
            ref={boardContainerRef}
            className="screen-in relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/30"
            style={{
              width: "min(100%, calc(100dvh - 200px))",
              boxShadow: `0 0 0 0px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 100px 15px ${theme.systemDesign?.cardGlow ?? "transparent"}`
            }}
          >
            <BoardWithCoords
              orientation={playerColor}
              boardLight={theme.systemDesign?.boardLight}
              boardDark={theme.systemDesign?.boardDark}
              options={{
                id: `game-${unit.kind === "pair" ? unit.short.id + "-" + unit.long.id : unit.opening.id}`,
                position: fen,
                onPieceDrop,
                animationDurationInMs: 260,
                showAnimations: true,
                allowDragging: status === "playing" && !promotionData,
              }}
            />

            {/* Promotion overlay */}
            {promotionData && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 shadow-2xl border border-border">
                  <span className="text-sm font-bold text-foreground">Выберите фигуру</span>
                  <div className="flex gap-3">
                    {[
                      { id: "q", label: "Ферзь", icon: "♕" },
                      { id: "r", label: "Ладья", icon: "♖" },
                      { id: "b", label: "Слон", icon: "♗" },
                      { id: "n", label: "Конь", icon: "♘" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePromotionSelect(p.id as any)}
                        className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background text-4xl transition hover:border-accent hover:bg-accent/10 hover:text-accent active:scale-95"
                        title={p.label}
                      >
                        {p.icon}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPromotionData(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-4"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Pair transition banner */}
            {pairTransition && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="screen-in flex max-w-[92%] flex-col items-center gap-2 rounded-2xl border border-accent/60 bg-background/95 px-6 py-5 text-center shadow-2xl shadow-black/60 backdrop-blur-sm">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    <Link2 className="h-3.5 w-3.5" />
                    Переход к длинному варианту
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-foreground md:text-base">
                    <span className="rounded-md bg-muted px-2 py-0.5">{pairTransition.from}</span>
                    <ArrowRight className="h-4 w-4 text-accent" />
                    <span className="rounded-md bg-accent/15 px-2 py-0.5 text-accent">{pairTransition.to}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Позиция сохранена — продолжайте партию</span>
                </div>
              </div>
            )}
          </div>
          </div>{/* end absolute board wrapper */}

          {/* Toast */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
            {toast && (
              <div className={`screen-in inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
                toast.kind === "success"
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-error/40 bg-error/15 text-error"
              }`}>
                {toast.text}
              </div>
            )}
            {status === "failed" && (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleUndoMove}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" />
                  Отмотать ход
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"
                >
                  Продолжить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DRAWER: Description */}
        <div className="relative flex items-stretch z-20">
          {/* Tab */}
          <button
            type="button"
            onClick={() => setDescOpen(o => !o)}
            className="absolute top-1/2 -translate-y-1/2 -left-8 z-30 flex h-16 w-8 flex-col items-center justify-center gap-1 rounded-l-xl border border-r-0 border-border text-muted-foreground transition hover:text-foreground"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "color-mix(in srgb, var(--card) 75%, transparent)",
            }}
            aria-label="Описание"
          >
            {descOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Инфо</span>
          </button>
          {/* Panel */}
          <div
            className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              width: descOpen ? "340px" : "0px",
              opacity: descOpen ? 1 : 0,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "color-mix(in srgb, var(--card) 75%, transparent)",
              borderLeft: descOpen ? "1px solid var(--border)" : "none",
            }}
          >
            <div className="flex-1 overflow-y-auto min-w-[340px] p-6 flex flex-col gap-4">
              <span className="text-sm font-semibold">Описание</span>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-card-foreground">
                {currentOpening.description || "Для этого дебюта не указано описание."}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-2">
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {parsed.fullMoveCount} полных ходов
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {parsed.moves.length} полуходов
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Exit button - fixed bottom left */}
      <div className="fixed bottom-4 left-4 z-30">
        <button
          type="button"
          onClick={() => setExitConfirm(true)}
          className="inline-flex items-center gap-2 rounded-full border border-error/60 bg-error px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:brightness-110"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>

      {/* Exit confirmation */}
      {exitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="screen-in w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Выйти из сессии?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Текущая тренировочная сессия будет аннулирована. Вы вернётесь на главный экран.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExitConfirm(false)}
                className="h-10 rounded-md border border-border bg-transparent px-4 text-sm font-medium transition
                  hover:bg-accent"
              >
                Остаться
              </button>
              <button
                type="button"
                onClick={doExit}
                className="h-10 rounded-md bg-error px-4 text-sm font-semibold text-white transition
                  hover:brightness-110"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}