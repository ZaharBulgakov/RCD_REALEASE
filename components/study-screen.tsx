"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  BookOpen,
  Compass,
  Tag,
  MessageSquare,
  MousePointer2,
  Trash2,
  Plus,
  Pencil,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  Shield,
  Zap,
} from "lucide-react"
import type { Opening, StudyMetadata, MarkerType, Marker, Arrow, ArrowType } from "@/lib/openings"
import { parsePgn } from "@/lib/openings"
import { BoardWithCoords } from "./board-with-coords"
import { ChessTheme } from "@/lib/themes"
import { chessSounds } from "@/lib/sounds"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

type Props = {
  opening: Opening
  onExit: (fromStudyScreen?: boolean) => void
  onUpdateMetadata?: (id: string, metadata: StudyMetadata) => Promise<void>
  theme: ChessTheme
  initialOrientation?: "white" | "black"
  pgnFormat?: "standard" | "short"
}

function computeBookPrefix(history: string[], book: string[]): number {
  const max = Math.min(history.length, book.length)
  let i = 0
  while (i < max && history[i] === book[i]) i++
  return i
}

function fenAtPly(history: string[], ply: number): string {
  const c = new Chess()
  for (let i = 0; i < ply; i++) {
    try {
      c.move(history[i], { strict: false })
    } catch {
      break
    }
  }
  return c.fen()
}

export function StudyScreen({ opening, onExit, onUpdateMetadata, theme, initialOrientation = "white", pgnFormat = "standard" }: Props) {
  const parsed = useMemo(() => parsePgn(opening.pgn), [opening.pgn])

  // Pre-populate history with the full theory line so forward arrow naturally
  // walks through it.
  const [history, setHistory] = useState<string[]>(() => parsed.moves.slice())
  const [cursor, setCursor] = useState<number>(0)
  const [orientation, setOrientation] = useState<"white" | "black">(initialOrientation)
  const [promotionData, setPromotionData] = useState<{
    from: string
    to: string
    color: "w" | "b"
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // --- Study Tools States ---
  const [markersMode, setMarkersMode] = useState(false)
  const [studyMetadata, setStudyMetadata] = useState<StudyMetadata>(() => opening.studyMetadata || { markers: {}, arrows: {}, comments: {} })
  const [activeMarkerMenu, setActiveMarkerMenu] = useState<{ square: string; x: number; y: number } | null>(null)
  const [currentArrow, setCurrentArrow] = useState<{ from: string; type: ArrowType; to?: string; points: string[] } | null>(null)
  const [hoverSquare, setHoverSquare] = useState<string | null>(null)
  const [lastClickTime, setLastClickTime] = useState<number>(0)
  const [showStudyTools, setShowStudyTools] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rcd_study_tools_visible") !== "false"
    }
    return true
  })
  const [editingComment, setEditingComment] = useState(false)
  const [commentText, setCommentText] = useState("")
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rcd_study_tools_visible", String(showStudyTools))
    }
  }, [showStudyTools])

  // Save metadata to DB with debounce, skip on first render (initialization)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!onUpdateMetadata) return
    const timer = setTimeout(() => {
      onUpdateMetadata(opening.id, studyMetadata)
    }, 1000)
    return () => clearTimeout(timer)
  }, [studyMetadata, onUpdateMetadata, opening.id])

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(t)
    }
  }, [error])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  // When opening changes (shouldn't during a single mount, but just in case), reset.
  useEffect(() => {
    setHistory(parsed.moves.slice())
    setCursor(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening.id, opening.pgn])

  const bookPrefixLength = useMemo(
    () => computeBookPrefix(history, parsed.moves),
    [history, parsed.moves],
  )
  const fen = useMemo(() => fenAtPly(history, cursor), [history, cursor])
  const isRepetition = useMemo(() => {
    const c = new Chess()
    for (let i = 0; i < cursor; i++) {
      try {
        c.move(history[i], { strict: false })
      } catch {
        break
      }
    }
    return c.isThreefoldRepetition()
  }, [history, cursor])

  const inBook = cursor <= bookPrefixLength
  const diverged = history.length !== parsed.moves.length || bookPrefixLength < history.length

  // --- Study Tools Logic ---

  const currentMarkers = useMemo(() => studyMetadata.markers[cursor] || [], [studyMetadata.markers, cursor])
  const currentArrows = useMemo(() => studyMetadata.arrows[cursor] || [], [studyMetadata.arrows, cursor])
  const currentComment = useMemo(() => studyMetadata.comments[cursor] || "", [studyMetadata.comments, cursor])

  const markerColors: Record<MarkerType, string> = {
    blunder: "rgba(239, 68, 68, 0.4)", // Red
    brilliant: "rgba(20, 184, 166, 0.4)", // Turquoise
    great: "rgba(59, 130, 246, 0.4)", // Blue
    mistake: "rgba(249, 115, 22, 0.4)", // Orange
    inaccuracy: "rgba(234, 179, 8, 0.4)", // Yellow
    deviation: "rgba(168, 85, 247, 0.4)", // Purple
    none: "transparent"
  }

  const markerIcons: Record<MarkerType, string> = {
    blunder: "??",
    brilliant: "!!",
    great: "!",
    mistake: "?",
    inaccuracy: "!?",
    deviation: "?",
    none: ""
  }

  const handleSetMarker = (type: MarkerType) => {
    if (!activeMarkerMenu) return
    const square = activeMarkerMenu.square
    
    setStudyMetadata(prev => {
      const markers = { ...prev.markers }
      const plyMarkers = [...(markers[cursor] || [])].filter(m => m.square !== square)
      
      if (type !== "none") {
        plyMarkers.push({ square, type })
      }
      
      markers[cursor] = plyMarkers
      return { ...prev, markers }
    })
    setActiveMarkerMenu(null)
  }

  const handleStartArrow = (type: ArrowType) => {
    if (!activeMarkerMenu) return
    setCurrentArrow({ from: activeMarkerMenu.square, type, points: [] })
    setActiveMarkerMenu(null)
  }

  const handleSquareClick = (square: string) => {
    if (!markersMode) return

    const now = Date.now()
    const isDoubleClick = now - lastClickTime < 300
    setLastClickTime(now)

    // If drawing arrow — single click on different square finishes it
    if (currentArrow) {
      if (square !== currentArrow.from) {
        setStudyMetadata(prev => {
          const arrows = { ...prev.arrows }
          const plyArrows = [...(arrows[cursor] || [])]
          // Avoid duplicate arrows
          const exists = plyArrows.some(a => a.from === currentArrow.from && a.to === square && a.type === currentArrow.type)
          if (!exists) {
            plyArrows.push({ from: currentArrow.from, to: square, type: currentArrow.type, points: [] })
          }
          arrows[cursor] = plyArrows
          return { ...prev, arrows }
        })
      }
      setCurrentArrow(null)
      return
    }

    // If click on existing arrow, allow deletion (simple: click near head or tail)
    const existingArrowIndex = currentArrows.findIndex(a => a.to === square || a.from === square)
    if (existingArrowIndex !== -1 && !activeMarkerMenu) {
       // Optional: Show edit/delete menu for arrow. For now just toggle marker menu.
    }

    // Open menu
    setActiveMarkerMenu({ square, x: 0, y: 0 })
  }

  const CustomSquare = useCallback(({ square, children }: any) => {
    const marker = currentMarkers.find(m => m.square === square)
    const bgColor = marker ? markerColors[marker.type] : "transparent"
    const icon = marker ? markerIcons[marker.type] : ""

    return (
      <div 
        style={{ position: "relative", width: "100%", height: "100%", backgroundColor: bgColor }}
        onMouseDown={(e) => {
          // react-chessboard onSquareClick is better, but we can catch it here too
        }}
      >
        {children}
        {icon && (
          <div className="absolute top-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-[10px] font-bold shadow-sm select-none">
            {icon}
          </div>
        )}
      </div>
    )
  }, [currentMarkers, markersMode, cursor, currentArrow])

  // Highlight valid target squares when drawing an arrow
  const arrowSquareStyles = useMemo(() => {
    if (!currentArrow) return {}
    const styles: Record<string, React.CSSProperties> = {}
    // Highlight source square
    styles[currentArrow.from] = { backgroundColor: currentArrow.type === "attack" ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)", borderRadius: "4px" }
    return styles
  }, [currentArrow])

  const boardArrows = useMemo(() => {
     const arrows: any[] = []
     
     // Existing arrows from metadata — only straight arrows (library limitation)
     currentArrows.forEach((a: any) => {
       const color = a.type === "attack" ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)"
       const from = a.from.toLowerCase()
       const to = a.to.toLowerCase()
       if (from !== to) {
         arrows.push({ startSquare: from, endSquare: to, color })
       }
     })
     
     // Preview arrow while drawing
     if (currentArrow && hoverSquare && currentArrow.from.toLowerCase() !== hoverSquare.toLowerCase()) {
       const color = currentArrow.type === "attack" ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.4)"
       arrows.push({ startSquare: currentArrow.from.toLowerCase(), endSquare: hoverSquare.toLowerCase(), color })
     }
     
     // Deduplicate by startSquare+endSquare to avoid React key conflicts
     const seen = new Set<string>()
     return arrows.filter((a: any) => {
       const key = a.startSquare + "-" + a.endSquare
       if (seen.has(key)) return false
       seen.add(key)
       return true
     })
   }, [currentArrows, currentArrow, hoverSquare])

  // --- Keyboard arrows ---

  const goTo = useCallback(
    (ply: number) => {
      const clamped = Math.max(0, Math.min(history.length, ply))
      setCursor(clamped)
    },
    [history.length],
  )

  const goStart = useCallback(() => setCursor(0), [])
  const goEnd = useCallback(() => setCursor(history.length), [history.length])
  const goBack = useCallback(() => setCursor((c) => Math.max(0, c - 1)), [])
  const goForward = useCallback(
    () => setCursor((c) => Math.min(history.length, c + 1)),
    [history.length],
  )

  const resetToTheory = useCallback(() => {
    setHistory(parsed.moves.slice())
    setCursor(0)
  }, [parsed.moves])

  const flipBoard = useCallback(
    () => setOrientation((o) => (o === "white" ? "black" : "white")),
    [],
  )

  // Keyboard arrows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (e.shiftKey) goStart()
        else goBack()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        if (e.shiftKey) goEnd()
        else goForward()
      } else if (e.key === "f" || e.key === "F") {
        flipBoard()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goBack, goForward, goStart, goEnd, flipBoard])

  // --- Clicking a PGN row ------------------------------------------------

  const jumpToBook = useCallback(
    (ply: number) => {
      const clamped = Math.max(0, Math.min(parsed.moves.length, ply))
      // Snap to pure book state at the given ply. Any free tail is discarded,
      // and the full theory line is restored so forward navigation continues.
      setHistory(parsed.moves.slice())
      setCursor(clamped)
    },
    [parsed.moves],
  )

  // --- Making a move on the board ---------------------------------------

  const handlePieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string
      targetSquare: string | null
    }): boolean => {
      if (!targetSquare) return false
      if (promotionData || isRepetition) return false

      const P = cursor
      // Build a chess instance at position P
      const c = new Chess()
      for (let i = 0; i < P; i++) {
        try {
          c.move(history[i], { strict: false })
        } catch {
          /* ignore */
        }
      }

      // Check for promotion
      const piece = c.get(sourceSquare as any)
      const turn = c.turn()
      const isPromotion =
        piece?.type === "p" &&
        ((turn === "w" && targetSquare[1] === "8") || (turn === "b" && targetSquare[1] === "1"))

      if (isPromotion) {
        // Validate it's a legal move first (using queen as proxy)
        const test = new Chess(c.fen())
        try {
          const move = test.move({ from: sourceSquare, to: targetSquare, promotion: "q" })
          if (move) {
            setPromotionData({ from: sourceSquare, to: targetSquare, color: turn })
            return true
          }
        } catch {
          return false
        }
      }

      let attempted
      try {
        attempted = c.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        })
      } catch {
        return false
      }
      if (!attempted) return false

      const san = attempted.san

      // Case 1: the move matches what was already next in our history array
      // (either a book move we haven't yet passed, or replaying the existing free tail).
      if (P < history.length && history[P] === san) {
        chessSounds.playMoveSound()
        setCursor(P + 1)
        return true
      }

      // Case 2: new move -> truncate & append
      const next = history.slice(0, P)
      next.push(san)
      setHistory(next)
      setCursor(P + 1)
      chessSounds.playMoveSound()
      return true
    },
    [cursor, history, promotionData],
  )

  const handlePromotionSelect = useCallback(
     (piece: "q" | "r" | "b" | "n") => {
       if (!promotionData || isRepetition) return
       const { from, to } = promotionData
      setPromotionData(null)

      const P = cursor
      const c = new Chess()
      for (let i = 0; i < P; i++) {
        try {
          c.move(history[i], { strict: false })
        } catch {
          /* ignore */
        }
      }

      let attempted
      try {
        attempted = c.move({ from, to, promotion: piece })
      } catch {
        return
      }

      if (!attempted) return

      const san = attempted.san

      if (P < history.length && history[P] === san) {
        chessSounds.playMoveSound()
        setCursor(P + 1)
      } else {
        const next = history.slice(0, P)
        next.push(san)
        setHistory(next)
        setCursor(P + 1)
        chessSounds.playMoveSound()
      }
    },
    [cursor, history, promotionData],
  )

  // --- Rendering helpers -------------------------------------------------

  const totalPlies = history.length
  const progressLabel = totalPlies > 0 ? `${cursor} / ${totalPlies}` : "0 / 0"
  const currentMoveLabel = useMemo(() => {
    if (cursor === 0) return "Начальная позиция"
    const idx = cursor - 1
    const san = history[idx]
    const moveNo = Math.floor(idx / 2) + 1
    const dots = idx % 2 === 0 ? "." : "..."
    return `${moveNo}${dots} ${san}`
  }, [cursor, history])

  // Build a table of rows from parsed.moves (theory). Each row: moveNo, white, black.
  const theoryRows = useMemo(() => {
    const rows: { no: number; white?: string; black?: string; whitePly: number; blackPly: number }[] = []
    for (let i = 0; i < parsed.moves.length; i += 2) {
      rows.push({
        no: i / 2 + 1,
        white: parsed.moves[i],
        black: parsed.moves[i + 1],
        whitePly: i,
        blackPly: i + 1,
      })
    }
    return rows
  }, [parsed.moves])

  return (
    <TooltipProvider delayDuration={0}>
    <div className="screen-in flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onExit()}
              aria-label="Назад к списку"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Режим изучения
              </span>
              <h1 className="text-xl font-semibold text-pretty md:text-2xl">
                {opening.name}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge inBook={inBook} diverged={diverged} />
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium ">
              Ход {progressLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(280px,340px)]">
          {/* Left: description */}
          <aside className="order-2 min-w-0 lg:order-1">
            <div className="sticky top-6 flex min-w-[300px] flex-col gap-4 rounded-xl border border-border bg-card px-6 py-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Описание
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
              <div className="mt-auto flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    ←
                  </kbd>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    →
                  </kbd>
                  <span>— листать ходы</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    Shift
                  </kbd>
                  <span>+</span>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    ←/→
                  </kbd>
                  <span>— в начало / конец</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    F
                  </kbd>
                  <span>— развернуть доску</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Center: board + controls */}
          <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
            <div className="w-full max-w-[640px] relative rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/30" style={{ boxShadow: `0 0 0 0px color-mix(in srgb, var(--primary) 100%, transparent), 0 0 100px 15px ${theme.systemDesign?.cardGlow ?? "transparent"}` }}>
              <BoardWithCoords
                orientation={orientation}
                boardLight={theme.systemDesign?.boardLight}
                boardDark={theme.systemDesign?.boardDark}
                customSquare={CustomSquare}
                options={{
                  id: `study-${opening.id}`,
                  position: fen,
                  onPieceDrop: handlePieceDrop,
                  onSquareClick: ({ square }) => handleSquareClick(square),
                  onMouseOverSquare: ({ square }) => setHoverSquare(square),
                  onMouseOutSquare: () => setHoverSquare(null),
                  animationDurationInMs: 220,
                  showAnimations: true,
                  allowDragging: !promotionData && !markersMode,
                  boardStyle: { width: "100%", height: "100%" },
                  squareStyles: currentArrow ? arrowSquareStyles : {},
                  arrows: boardArrows,
                }}
              />

              {/* Marker Menu Overlay */}
              {activeMarkerMenu && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-2xl border border-border pointer-events-auto animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between gap-4 mb-2 border-b border-border pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Клетка {activeMarkerMenu.square}</span>
                      <button onClick={() => setActiveMarkerMenu(null)} className="text-muted-foreground hover:text-foreground">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: "brilliant", icon: "!!", color: "bg-teal-500", label: "Блестящий" },
                        { type: "great", icon: "!", color: "bg-blue-500", label: "Замечательный" },
                        { type: "inaccuracy", icon: "!?", color: "bg-yellow-500", label: "Неточность" },
                        { type: "mistake", icon: "?", color: "bg-orange-500", label: "Ошибка" },
                        { type: "blunder", icon: "??", color: "bg-red-500", label: "Зевок" },
                        { type: "deviation", icon: "?", color: "bg-purple-500", label: "Отклонение" },
                        { type: "none", icon: <Trash2 className="h-3 w-3" />, color: "bg-muted", label: "Очистить" },
                      ].map((m) => (
                        <Tooltip key={m.type}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleSetMarker(m.type as MarkerType)}
                              className={`flex h-10 w-10 items-center justify-center rounded-lg text-white font-black transition active:scale-95 ${m.color} hover:brightness-110 shadow-sm`}
                            >
                              {m.icon}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px]">{m.label}</p></TooltipContent>
                        </Tooltip>
                      ))}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleStartArrow("attack")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/40 text-red-500 transition active:scale-95 hover:bg-red-500/30"
                          >
                            <MousePointer2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-[10px]">Атака (красная)</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleStartArrow("defense")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-500 transition active:scale-95 hover:bg-blue-500/30"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-[10px]">Защита (синяя)</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              setStudyMetadata(prev => {
                                const arrows = { ...prev.arrows }
                                const plyArrows = [...(arrows[cursor] || [])].filter(a => a.from !== activeMarkerMenu.square && a.to !== activeMarkerMenu.square)
                                arrows[cursor] = plyArrows
                                return { ...prev, arrows }
                              })
                              setActiveMarkerMenu(null)
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition active:scale-95 hover:bg-muted/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-[10px]">Удалить стрелки с этой клетки</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}

              {/* Arrow Drawing Overlay */}
              {currentArrow && (
                <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center">
                   <div className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg animate-bounce">
                     {currentArrow.type === "attack" ? "Рисование атаки..." : "Рисование защиты..."}
                   </div>
                   <div className="mt-2 rounded-lg bg-card/90 px-3 py-1.5 text-[10px] text-muted-foreground shadow-md backdrop-blur-sm">
                     Кликни на любую клетку — стрелка будет поставлена
                   </div>
                </div>
              )}

              {/* Promotion selection overlay */}
              {promotionData && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl">
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
                          className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background text-4xl transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
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

              {/* Error overlay (e.g. repetition) */}
              {(error || isRepetition) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <div className="rounded-full bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground shadow-lg animate-in fade-in zoom-in duration-300">
                    {isRepetition ? "Ничья (повторение ходов)" : error}
                  </div>
                </div>
              )}
            </div>

            {/* Controls row */}
            <div className="flex w-full max-w-[640px] flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
                {/* ... (existing nav buttons) ... */}
                <IconButton onClick={goStart} disabled={cursor === 0} label="В начало (Shift+←)"><ChevronsLeft className="h-4 w-4" /></IconButton>
                <IconButton onClick={goBack} disabled={cursor === 0} label="Предыдущий ход (←)"><ChevronLeft className="h-4 w-4" /></IconButton>
                <div className="mx-2 min-w-[7rem] text-center font-mono text-xs text-muted-foreground">{currentMoveLabel}</div>
                <IconButton onClick={goForward} disabled={cursor === history.length} label="Следующий ход (→)"><ChevronRight className="h-4 w-4" /></IconButton>
                <IconButton onClick={goEnd} disabled={cursor === history.length} label="В конец (Shift+→)"><ChevronsRight className="h-4 w-4" /></IconButton>
              </div>

              {/* Study Tools Toggles */}
              <div className="flex items-center gap-2 ml-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setMarkersMode(!markersMode)
                        setActiveMarkerMenu(null)
                        setCurrentArrow(null)
                      }}
                      className={`inline-flex h-9 px-3 items-center gap-2 rounded-full border border-border transition font-bold text-[10px] uppercase tracking-wider ${
                        markersMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {markersMode ? "Режим меток ВКЛ" : "Режим меток"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-[10px]">В этом режиме нельзя двигать фигуры, только ставить метки и стрелки</p></TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => setShowStudyTools(!showStudyTools)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border transition ${
                    showStudyTools ? "bg-primary/10 border-primary/40 text-primary" : "bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  }`}
                  title={showStudyTools ? "Скрыть инструменты" : "Показать инструменты"}
                >
                  <Compass className="h-4 w-4" />
                </button>

                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-9 w-9 cursor-help items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/60 hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-4">
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Инструкция по меткам</p>
                        <ul className="list-disc pl-4 text-[10px] space-y-1 text-muted-foreground">
                          <li>Включите <span className="text-foreground font-bold">Режим меток</span>, чтобы рисовать на доске.</li>
                          <li><span className="text-foreground font-bold">Метки:</span> Кликните на клетку и выберите значок (!!, ?, ?? и т.д.).</li>
                          <li><span className="text-foreground font-bold">Стрелки:</span> Выберите тип стрелки в меню клетки, затем кликни на целевую клетку.</li>
                          <li><span className="text-foreground font-bold">Удалить стрелки:</span> В меню клетки нажмите на иконку корзины.</li>
                          <li>Стрелки и метки привязаны к конкретному ходу.</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
              </div>

              <button
                type="button"
                onClick={flipBoard}
                title="Развернуть доску (F)"
                aria-label="Развернуть доску"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {diverged && (
                <button
                  type="button"
                  onClick={resetToTheory}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Вернуть теорию
                </button>
              )}
            </div>

            {/* Comment Section below controls */}
            {showStudyTools && (
              <div className="w-full max-w-[640px] mt-4 space-y-3">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                     <MessageSquare className="h-4 w-4 text-primary" />
                     <span className="text-xs font-bold uppercase tracking-wider">Комментарий к ходу</span>
                   </div>
                   <div className="flex gap-2">
                     {currentComment ? (
                       <>
                         <button onClick={() => { setCommentText(currentComment); setEditingComment(true) }} className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase">Изменить</button>
                         <button onClick={() => {
                           setStudyMetadata(prev => {
                             const comments = { ...prev.comments }
                             delete comments[cursor]
                             return { ...prev, comments }
                           })
                         }} className="text-[10px] font-bold text-muted-foreground hover:text-red-500 uppercase">Удалить</button>
                       </>
                     ) : (
                       <button onClick={() => { setCommentText(""); setEditingComment(true) }} className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase"><Plus className="h-3 w-3" /> Добавить</button>
                     )}
                   </div>
                </div>

                {editingComment ? (
                  <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-inner">
                    <textarea
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Введите описание хода или идеи..."
                      className="w-full min-h-[100px] bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                       <button onClick={() => setEditingComment(false)} className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition">Отмена</button>
                       <button 
                         onClick={() => {
                           setStudyMetadata(prev => {
                             const comments = { ...prev.comments }
                             comments[cursor] = commentText
                             return { ...prev, comments }
                           })
                           setEditingComment(false)
                         }}
                         className="px-4 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase transition hover:brightness-110"
                       >
                         Сохранить
                       </button>
                    </div>
                  </div>
                ) : (
                  currentComment ? (
                    <div className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
                      <p className="text-sm leading-relaxed text-card-foreground italic">"{currentComment}"</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-card/20 p-6 flex flex-col items-center justify-center gap-2 opacity-50">
                       <Info className="h-4 w-4 text-muted-foreground" />
                       <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Нет комментария для этого хода</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right: moves table */}
          <aside className="order-3 min-w-0">
            <div className="sticky top-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-5 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Ходы дебюта</span>
                  <span className="text-xs text-muted-foreground">
                    Клик по ходу — перейти к позиции
                  </span>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>

              <div
                className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card"
                style={{ height: 520 }}
              >
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 border-b border-border bg-muted/60 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider ">
                  <span>№</span>
                  <span>Белые</span>
                  <span>Чёрные</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {theoryRows.length === 0 ? (
                    <div className="p-5 font-mono text-xs text-muted-foreground">
                      PGN пуст.
                    </div>
                  ) : (
                    <ol className="divide-y divide-border/60">
                      {theoryRows.map((row) => {
                        return (
                          <li
                            key={row.no}
                            className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-6 px-5 py-1.5 font-mono text-sm tabular-nums"
                          >
                            <span className="text-muted-foreground">
                              {row.no}.
                            </span>
                            <MoveCell
                              san={row.white}
                              ply={row.whitePly}
                              cursor={cursor}
                              bookPrefixLength={bookPrefixLength}
                              historyLength={history.length}
                              onJump={jumpToBook}
                            />
                            <MoveCell
                              san={row.black}
                              ply={row.blackPly}
                              cursor={cursor}
                              bookPrefixLength={bookPrefixLength}
                              historyLength={history.length}
                              onJump={jumpToBook}
                            />
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Exit button - bottom left */}
      <div className="sticky bottom-0 left-0 z-10 mt-auto p-4">
        <button
          type="button"
          onClick={() => onExit(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-lg shadow-black/20 transition hover:border-primary/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку
        </button>
      </div>
    </div>
    </TooltipProvider>
  )
}

function ModeBadge({
  inBook,
  diverged,
}: {
  inBook: boolean
  diverged: boolean
}) {
  if (inBook) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
        <BookOpen className="h-3.5 w-3.5" />
        {diverged ? "Теория (есть расхождение)" : "Изучение теории"}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
      <Compass className="h-3.5 w-3.5" />
      Свободный режим
    </span>
  )
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  )
}

function MoveCell({
  san,
  ply,
  cursor,
  bookPrefixLength,
  historyLength,
  onJump,
}: {
  san?: string
  ply: number
  cursor: number
  bookPrefixLength: number
  historyLength: number
  onJump: (ply: number) => void
}) {
  if (!san) {
    return <span className="text-muted-foreground/60">—</span>
  }
  // Position after this move is ply+1. "Visited" means cursor > ply in the book prefix context.
  const afterPly = ply + 1
  const visited = cursor >= afterPly && afterPly <= bookPrefixLength
  const isCurrent = cursor === afterPly
  const outOfBook = afterPly > bookPrefixLength && bookPrefixLength < historyLength
  return (
    <button
      type="button"
      onClick={() => onJump(afterPly)}
      className={`-mx-1 truncate rounded px-1 py-0.5 text-left transition ${
        isCurrent
          ? "bg-primary/25 text-primary font-semibold"
          : visited
            ? "text-primary hover:bg-primary/10"
            : outOfBook
              ? "text-muted-foreground/70 hover:bg-muted"
              : "text-card-foreground hover:bg-muted"
      }`}
    >
      {san}
    </button>
  )
}
