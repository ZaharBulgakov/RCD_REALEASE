"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

const Chessboard = dynamic(
  async () => {
    const { Chessboard } = await import("react-chessboard")
    return { default: Chessboard }
  },
  { ssr: false }
)
import { parsePgn, type Opening } from "@/lib/openings"
import { findBestOpeningMatch } from "@/lib/openings-db"
import { Chess } from "chess.js"
import { X, Save, Eraser, Plus, Pencil, Wand2, Keyboard, Gamepad2, RotateCcw, ChevronDown } from "lucide-react"
import { Spinner } from "./ui/spinner"
import { ChessKeyboard } from "./chess-keyboard"
import { BoardWithCoords } from "./board-with-coords"
import { type ChessTheme } from "@/lib/themes"
import { getStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Props = {
  onSave: (opening: Opening) => Promise<string | null>
  initialOpening?: Opening | null
  onCancel?: () => void
  isInline?: boolean
  isSaving?: boolean
  currentTheme?: ChessTheme
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback: валидный UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function AddOpeningForm({ onSave, initialOpening, onCancel, isInline, isSaving = false, currentTheme }: Props) {
  const s = currentTheme ? getStyles(currentTheme) : null
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingOpening, setPendingOpening] = useState<Opening | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pgn, setPgn] = useState("")
  const [viewMode, setViewMode] = useState<"keyboard" | "board">("keyboard")
  const [isExpanded, setIsExpanded] = useState(false)
const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
  const [promotionData, setPromotionData] = useState<{ from: string; to: string; color: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const isEditMode = Boolean(initialOpening)

  // Use a ref for the chess instance to avoid stale closures in callbacks
  const chessRef = useRef(new Chess())

  // Helper to get clean PGN without headers and trailing result
  const getCleanPgn = useCallback((game: Chess) => {
    const fullPgn = game.pgn()
    const parts = fullPgn.split(/\n\n/)
    let moves = parts.length > 1 ? parts[parts.length - 1] : fullPgn
    moves = moves.replace(/\s+(\*|1-0|0-1|1\/2-1\/2)$/, "").trim()
    if (moves.startsWith("[")) return ""
    return moves
  }, [])

  const pgnInputRef = useRef<HTMLTextAreaElement>(null)
  const pgnHighlightRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  const syncScroll = () => {
    if (pgnInputRef.current && pgnHighlightRef.current) {
      pgnHighlightRef.current.scrollTop = pgnInputRef.current.scrollTop
    }
  }

  // Sync board FEN when PGN changes
  useEffect(() => {
    const syncBoard = () => {
      try {
        if (pgn.trim()) {
          const game = new Chess()
          try {
            game.loadPgn(pgn)
            setFen(game.fen())
            chessRef.current = game
          } catch {
            // Robust loading for partial/invalid PGN
            const tempGame = new Chess()
            const tokens = pgn.trim().split(/\s+/)
            for (const token of tokens) {
              if (!token || token.endsWith(".") || /^\d+$/.test(token)) continue
              try {
                tempGame.move(token)
              } catch {
                break
              }
            }
            setFen(tempGame.fen())
            chessRef.current = tempGame
          }
        } else {
          setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
          chessRef.current = new Chess()
        }
      } catch (e) {
        console.error("FEN sync error:", e)
      }
    }

    syncBoard()
  }, [pgn])

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare, piece }: { sourceSquare: string, targetSquare: string | null, piece: any }): boolean => {
  if (!targetSquare) return false
    const pieceType: string = typeof piece === "string" ? piece : piece?.pieceType ?? ""
    if (!targetSquare || !piece) return false
    
    // Always work with a fresh instance based on current PGN for move validation
    const game = new Chess()
    if (pgn.trim()) {
      try {
        game.loadPgn(pgn)
      } catch (e) {
        console.error("PGN load error in onPieceDrop:", e)
        // Fallback for partial PGN
        const tokens = pgn.trim().split(/\s+/)
        for (const token of tokens) {
          if (!token || token.endsWith(".") || /^\d+$/.test(token)) continue
          try { game.move(token) } catch { break }
        }
      }
    }

    const turn = game.turn()
    // Simple check for promotion: pawn moving to last/first rank
    const isPawn = pieceType.toLowerCase().includes("p")
    const isPromotion = isPawn && (
      (turn === "w" && targetSquare[1] === "8") || 
      (turn === "b" && targetSquare[1] === "1")
    )

    if (isPromotion) {
      // Validate that the move is at least possible (pseudo-legal)
      const moves = game.moves({ square: sourceSquare as any, verbose: true })
      const isPossible = moves.some(m => m.to === targetSquare)
      if (!isPossible) return false

      setPromotionData({ from: sourceSquare, to: targetSquare, color: turn })
      return true
    }

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      })

      if (move) {
        const newPgn = getCleanPgn(game)
        setPgn(newPgn)
        setFen(game.fen())
        chessRef.current = game
        setTimeout(syncScroll, 0)
        return true
      }
    } catch (e) {
      //console.error("Move execution error:", e)
    }
    return false
  }, [pgn, getCleanPgn])

  const handlePromotionSelect = useCallback((piece: string) => {
    if (!promotionData) return
    const game = new Chess()
    try {
      if (pgn.trim()) {
        try {
          game.loadPgn(pgn)
        } catch {
          const tokens = pgn.trim().split(/\s+/)
          for (const token of tokens) {
            if (!token || token.endsWith(".") || /^\d+$/.test(token)) continue
            try { game.move(token) } catch { break }
          }
        }
      }
      
      const move = game.move({
        from: promotionData.from,
        to: promotionData.to,
        promotion: piece
      })

      if (move) {
        const newPgn = getCleanPgn(game)
        setPgn(newPgn)
        setFen(game.fen())
        chessRef.current = game
        setTimeout(syncScroll, 0)
      }
    } catch (e) {
      console.error("Promotion move failed", e)
    } finally {
      setPromotionData(null)
    }
  }, [pgn, promotionData, getCleanPgn])

  const resetBoard = () => {
    setPgn("")
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    chessRef.current = new Chess()
    setError(null)
  }

  // Auto-expand description
  useEffect(() => {
    const textarea = descriptionRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [description])

  // Restore selection after state update
  useEffect(() => {
    if (selectionRef.current && pgnInputRef.current) {
      pgnInputRef.current.setSelectionRange(selectionRef.current.start, selectionRef.current.end)
      selectionRef.current = null
    }
  }, [pgn])

  // Persistence for drafts (only for inline "Add" form)
  useEffect(() => {
    if (isInline && !isEditMode) {
      const saved = localStorage.getItem("rcd_opening_draft_create")
      if (saved) {
        try {
          const { name: sName, description: sDesc, pgn: sPgn } = JSON.parse(saved)
          setName(sName || "")
          setDescription(sDesc || "")
          setPgn(sPgn || "")
        } catch (e) {
          console.error("Failed to load draft", e)
        }
      }
    }
  }, [isInline, isEditMode])

  useEffect(() => {
    if (isInline && !isEditMode) {
      if (name || description || pgn) {
        localStorage.setItem("rcd_opening_draft_create", JSON.stringify({ name, description, pgn }))
      } else {
        localStorage.removeItem("rcd_opening_draft_create")
      }
    }
  }, [name, description, pgn, isInline, isEditMode])

  useEffect(() => {
    if (initialOpening) {
      setName(initialOpening.name)
      setDescription(initialOpening.description)
      setPgn(initialOpening.pgn)
    } else if (!isInline) {
      setName("")
      setDescription("")
      setPgn("")
    }
    setError(null)
  }, [initialOpening, isInline])

  function reset() {
    setName("")
    setDescription("")
    setPgn("")
    setError(null)
    localStorage.removeItem("rcd_opening_draft_create")
  }

  function handleGenerate() {
    const match = findBestOpeningMatch(name)
    if (match) {
      setName(match[0])
      setPgn(match[1])
      setError(null)
    } else {
      setError("Соответствий не найдено. Попробуйте уточнить название.")
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (isSaving || loading) return
    setError(null)

    if (!name.trim()) {
      setError("Укажите название дебюта")
      return
    }
    if (!pgn.trim()) {
      setError("Введите PGN")
      return
    }

    const parsed = parsePgn(pgn)
    if (parsed.moves.length > 200) {
      setError("Превышен лимит ходов: максимум 200 полных ходов.")
      return
    }

    const openingToSave: Opening = {
      id: initialOpening?.id ?? generateId(),
      name: name.trim(),
      description: description.trim(),
      pgn: pgn.trim(),
      createdAt: initialOpening?.createdAt ?? Date.now(),
    }
    
    setPendingOpening(openingToSave)
    setShowConfirmDialog(true)
  }

  async function handleConfirmSave() {
    if (!pendingOpening) return

    setLoading(true)
    const saveError = await onSave(pendingOpening)
    setLoading(false)
    
    if (saveError) {
      setError(saveError)
      setShowConfirmDialog(false)
      setPendingOpening(null)
      return
    }
    
    if (!isEditMode) {
      reset()
    }
    if (onCancel && isEditMode) {
      onCancel()
    }
    setShowConfirmDialog(false)
    setPendingOpening(null)
  }

  const handleKeyPress = (key: string) => {
    let newPgn = pgn
    
    if (key === " ") {
      if (newPgn && !newPgn.endsWith(" ")) {
        const tokens = newPgn.trim().split(/\s+/)
        const moves = tokens.filter(t => !t.endsWith(".") && !/^\d+$/.test(t))
        
        // If we have an even number of half-moves (2, 4, 6...), add the next move number
        if (moves.length > 0 && moves.length % 2 === 0) {
          const nextNum = (moves.length / 2) + 1
          newPgn = newPgn.trimEnd() + ` ${nextNum}. `
        } else {
          newPgn = newPgn.trimEnd() + " "
        }
      }
    } else {
      if (!newPgn) {
        newPgn = `1. ${key}`
      } else if (newPgn.endsWith(". ")) {
        newPgn = newPgn + key
      } else if (newPgn.endsWith(".")) {
        newPgn = newPgn + " " + key
      } else {
        // Check if we need to add a space before the next move if it's the second ply
        const tokens = newPgn.trim().split(/\s+/)
        const lastToken = tokens[tokens.length - 1]
        const moves = tokens.filter(t => !t.endsWith(".") && !/^\d+$/.test(t))
        
        if (lastToken && !lastToken.endsWith(".") && moves.length % 2 !== 0 && !newPgn.endsWith(" ")) {
          // We just finished the first ply of a move and are starting the second ply without a space
          // Actually, chess notation usually has a space: 1. e4 e5
          // If the user types 'e', '4', then 'e', we should probably auto-space if it looks like a new move
          // But it's safer to let the user use space as they requested "Добавляю второй элемент через пробел"
          newPgn = newPgn + key
        } else {
          newPgn = newPgn + key
        }
      }
    }
    
    setPgn(newPgn)
    setTimeout(syncScroll, 0)
  }

  const handleDelete = () => {
    if (!pgn) return
    
    // Smart delete for both modes
    const game = new Chess()
    try {
      if (pgn.trim()) {
        game.loadPgn(pgn)
        const undone = game.undo()
        if (undone) {
          setPgn(getCleanPgn(game))
        } else {
          // If undo failed (maybe only move numbers left), fallback to slice
          setPgn(prev => prev.trimEnd().slice(0, -1).trimEnd())
        }
      } else {
        setPgn("")
      }
    } catch {
      // Fallback to simple slice if PGN is invalid
      setPgn(prev => prev.slice(0, -1).trimEnd())
    }
    
    setTimeout(syncScroll, 0)
  }

  const onPgnChange = (value: string) => {
    setPgn(value)
    setTimeout(syncScroll, 0)
  }

  // PGN highlighting logic
  const renderPgnWithHighlights = () => {
    if (!pgn) return null
    
    const tokens = pgn.split(/(\s+)/)
    const chess = new Chess()
    const elements: React.ReactNode[] = []
    
    let currentPlies: string[] = []
    
    tokens.forEach((token, idx) => {
      if (!token.trim()) {
        elements.push(<span key={idx}>{token}</span>)
        return
      }
      
      if (token.endsWith(".")) {
        // Move number
        elements.push(<span key={idx} className="text-muted-foreground">{token}</span>)
        return
      }
      
      // Chess move
      try {
        const move = chess.move(token, { strict: false })
        if (move) {
          elements.push(<span key={idx}>{token}</span>)
        } else {
          elements.push(<span key={idx} className="underline decoration-error decoration-wavy underline-offset-4">{token}</span>)
        }
      } catch {
        elements.push(<span key={idx} className="underline decoration-error decoration-wavy underline-offset-4">{token}</span>)
      }
    })
    
    return elements
  }

  return (
    <>
    <div 
      className={`flex flex-col w-full overflow-hidden transition-all duration-500 ease-in-out ${
        isInline ? "bg-card rounded-2xl " : "p-0"
      } ${isInline && !isExpanded && !isEditMode ? "max-h-[68px]" : "max-h-[2000px]"}`}
      style={isInline && s ? s.card : {}}
    >
      {(isInline || isEditMode) && (
          <div 
          className={`flex items-center justify-between px-6 py-4 transition-colors border-b ${
            isInline && !isEditMode ? "cursor-pointer hover:bg-accent/5" : ""
          }`}
          style={s ? { borderColor: `color-mix(in srgb, ${s.accent} 100%, transparent)` } : {}}
            onClick={() => isInline && !isEditMode && setIsExpanded(!isExpanded)}
          >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              {isEditMode ? <Pencil className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
            </div>
            <h3 className="font-bold text-lg tracking-tight whitespace-nowrap">
              {isEditMode ? "Редактировать дебют" : "Добавить новый дебют"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && isInline && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }} 
                  className="text-muted-foreground hover:text-error transition-colors p-2 rounded-full hover:bg-error/10" 
                  title="Очистить форму"
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`} />
              </>
            )}
          </div>
        </div>
      )}
      
      <div className={`flex flex-col gap-4 p-6 transition-all duration-500 ease-in-out ${
        isInline && !isExpanded && !isEditMode ? "pointer-events-none" : ""
      }`}>
        <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="opening-name" className="text-sm font-semibold text-foreground/80 ml-1">
            Название <span className="text-[10px] font-normal text-muted-foreground ml-1">({name.length}/100)</span>
          </label>
          <div className="relative flex items-center group">
            <input
              id="opening-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              placeholder="Итальянская партия"
              disabled={isSaving || loading}
              className="h-11 w-full rounded-xl border border-input bg-background pl-4 pr-12 text-sm outline-none transition
                shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={s ? { ...(focusedField === "name" ? s.inputFocus : s.input), boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` } : {}}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={name.length < 2 || isSaving || loading}
              className={`absolute right-2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground 
                hover:text-accent hover:bg-accent/10 transition-all active:scale-95 
                ${name.length === 0 ? "opacity-50" : "opacity-100"} 
                disabled:cursor-not-allowed`}
              title="Генерация названия и PGN"
            >
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="opening-description" className="text-sm font-semibold text-foreground/80 ml-1">
            Описание <span className="text-[10px] font-normal text-muted-foreground ml-1">({description.length}/600)</span>
          </label>
          <textarea
            id="opening-description"
            ref={descriptionRef}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 600))}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            placeholder="Короткая заметка о дебюте..."
            disabled={isSaving || loading}
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition
              resize-none shadow-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            style={s ? { ...(focusedField === "description" ? s.inputFocus : s.input), boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` } : {}}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="opening-pgn" className="text-sm font-semibold text-foreground/80 ml-1">
          PGN <span className="text-[10px] font-normal text-muted-foreground ml-1">({parsePgn(pgn).fullMoveCount}/200)</span>
        </label>
        <div className="relative w-full group">
          <div
            ref={pgnHighlightRef}
            className="rounded-xl border border-transparent bg-background px-4 py-3 font-mono text-sm whitespace-pre-wrap break-words pointer-events-none select-none min-h-[44px]"
            aria-hidden="true"
          >
            {renderPgnWithHighlights()}
            {/* Padding ghost line so textarea stays in sync */}
            <span className="invisible">|</span>
          </div>
          <textarea
            id="opening-pgn"
            ref={pgnInputRef}
            value={pgn}
            onChange={(e) => onPgnChange(e.target.value)}
            onFocus={() => setFocusedField("pgn")}
            onBlur={() => setFocusedField(null)}
            onScroll={syncScroll}
            placeholder="1. e4 e5 2. Nf3 ..."
            rows={1}
            className="absolute inset-0 w-full h-full z-10 rounded-xl border border-input bg-transparent px-4 py-3 font-mono text-sm text-transparent caret-accent outline-none transition
              resize-none overflow-hidden"
            spellCheck={false}
            style={s ? { ...(focusedField === "pgn" ? s.inputFocus : s.input), boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` } : {}}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-1 mt-1 mb-1">
        <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
          Режим ввода
        </span>
        <div className="flex bg-muted/50 rounded-lg p-0.5" style={s ? { border: `1px solid color-mix(in srgb, ${s.accent} 30%, transparent)`, boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}` } : {}}>
          <button
            type="button"
            onClick={() => setViewMode("keyboard")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
              viewMode === "keyboard" 
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                : "text-foreground hover:text-foreground"
                
            }`}
          >
            <Keyboard className="h-3 w-3" />
            Клавиатура
          </button>
          <button
            type="button"
            onClick={() => setViewMode("board")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
              viewMode === "board" 
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                : "text-foreground hover:text-foreground"
            }`}
          >
            <Gamepad2 className="h-3 w-3" />
            Доска
          </button>
        </div>
      </div>

      <div className="mt-1">
        {viewMode === "keyboard" ? (
          <ChessKeyboard 
            onKeyPress={handleKeyPress} 
            onDelete={handleDelete}
            onSpace={() => handleKeyPress(" ")}
            className="animate-in fade-in zoom-in-95 duration-200"
          />
        ) : (
          <div className="relative w-full flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-full max-w-[340px] rounded-lg border border-border">
<BoardWithCoords
  orientation="white"
  boardLight={currentTheme?.systemDesign?.boardLight}
  boardDark={currentTheme?.systemDesign?.boardDark}
  options={{
    position: fen,
    allowDragging: !promotionData,
    onPieceDrop,
    animationDurationInMs: 200,
  }}
/>
{/* Promotion selection overlay */}
              {promotionData && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
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
                          type="button"
                          onClick={() => handlePromotionSelect(p.id)}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-2xl transition hover:border-accent hover:bg-accent/10 hover:text-accent active:scale-95"
                          title={p.label}
                        >
                          {p.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex w-full max-w-[340px] justify-between items-center px-1">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Удалить ход
              </button>
              <button
                type="button"
                onClick={resetBoard}
                className="text-[10px] text-muted-foreground hover:text-error transition-colors underline underline-offset-4"
              >
                Сбросить всё
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-error/15 p-3 text-sm text-error font-medium border border-error/20 animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <div className="mt-1 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving || loading}
            className="h-10 rounded-lg border border-border px-6 text-sm font-medium transition hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
        )}
<button
  type="button"
  onClick={handleSubmit}
  disabled={loading || isSaving}
  className={`flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold shadow-lg transition
    hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${isInline ? "w-full" : ""}`}
  style={s ? { 
    backgroundColor: s.accent,
    color: s.accent === "#ffffffff" || s.accent === "#ffffff" ? "#000000" : "#ffffff",
    boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 40%, transparent), 0 0 12px 2px ${s.glow}` 
  } : { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
>
          {loading || isSaving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isEditMode ? "Сохранить изменения" : isInline ? "Добавить дебют" : "Создать дебют"}
        </button>
      </div>
    </div>
  </div>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEditMode ? "Сохранить изменения дебюта?" : "Добавить новый дебют?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode
                ? "Вы собираетесь сохранить изменения в этом дебюте. Вы уверены?"
                : "Вы собираетесь добавить новый дебют в свою базу. Вы уверены?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving || loading}
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingOpening(null)
              }}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSaving || loading} onClick={handleConfirmSave}>
              {isEditMode ? "Сохранить" : "Добавить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
