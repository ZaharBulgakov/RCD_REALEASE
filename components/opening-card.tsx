"use client"

import { Pencil, Trash2, LayoutGrid, Grid3X3, Check } from "lucide-react"
import type { Opening } from "@/lib/openings"
import { parsePgn } from "@/lib/openings"
import { useMemo, useRef, useState } from "react"
import { BoardWithCoords } from "./board-with-coords"
import { ChessTheme } from "@/lib/themes"
import { getStyles } from "@/lib/styles"


type Props = {
  opening: Opening
  onDelete: (id: string) => Promise<void>
  onEdit: (opening: Opening) => void
  onStudy: (opening: Opening, fromHistory?: boolean) => void
  isDeleteMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  theme: ChessTheme
  isSaving?: boolean
  onLongPress?: (opening: Opening) => void
}

export function OpeningCard({
  opening,
  onDelete,
  onEdit,
  onStudy,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  theme,
  isSaving,
  onLongPress,
}: Props) {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressThreshold = 500 // 500ms for long press
    const s = getStyles(theme)
  const parsed = useMemo(() => parsePgn(opening.pgn), [opening.pgn])
  const updatedLabel = useMemo(() => {
    const d = new Date(opening.createdAt)
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    } catch {
      return d.toLocaleString()
    }
  }, [opening.createdAt])



  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSaving || isDeleteMode) return
    
    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      if (onLongPress) {
        onLongPress(opening)
      }
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, longPressThreshold)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // If it wasn't a long press, handle normal click
    if (!isLongPressing && !isDeleteMode && onToggleSelect) {
      onStudy(opening)
    }
    
    setIsLongPressing(false)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Clear long press timer when mouse leaves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
    
    // Update styles
    const target = e.currentTarget as HTMLElement
    Object.assign(target.style, isSelected ? s.cardSelected : s.card)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSaving || isDeleteMode) return
    
    // Start long press timer for touch devices
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      if (onLongPress) {
        onLongPress(opening)
      }
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, longPressThreshold)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // If it wasn't a long press, handle normal click
    if (!isLongPressing && !isDeleteMode && onToggleSelect) {
      onStudy(opening)
    }
    
    setIsLongPressing(false)
  }

  const handleTouchCancel = () => {
    // Clear long press timer when touch is cancelled
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isSaving) return
    if (isDeleteMode && onToggleSelect) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelect(opening.id)
    }
    // Normal click is handled in mouseUp/touchEnd to avoid conflict with long press
  }

  return (
    <div
      role="button"
      tabIndex={isSaving ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isSaving) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (isDeleteMode && onToggleSelect) {
            onToggleSelect(opening.id)
          } else {
            onStudy(opening)
          }
        }
      }}
      style={isSelected ? s.cardSelected : s.card}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.cardHover)}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, isSelected ? s.cardSelected : s.card)}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-transparent bg-card transition-all duration-300
        ${isSaving ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}
        ${isSelected ? "-translate-y-0.5" : "hover:-translate-y-0.5"}
        ${isLongPressing ? "scale-95 opacity-80" : ""}
        focus:outline-none`}
    >
      {/* Selection Checkbox */}
      {isDeleteMode && (
        <div className="absolute left-3 top-3 z-30 pointer-events-none">
          <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all
            ${isSelected 
              ? "bg-accent border-accent scale-110 shadow-md" 
              : "bg-background/80 border-border backdrop-blur-sm"}`}
          >
            {isSelected && <Check className="h-4 w-4 text-accent-foreground stroke-[3px]" />}
          </div>
        </div>
      )}

      {/* Preview with Icons overlay - Long press area */}
      <div 
        className="relative aspect-square w-full overflow-hidden bg-muted/40 rounded-t-xl"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div className="absolute inset-0 select-none flex items-center justify-center">
          <div className="w-full h-full">
            <BoardWithCoords
              orientation="white"
              boardLight={theme.systemDesign?.boardLight}
              boardDark={theme.systemDesign?.boardDark}
              options={{
                id: `preview-${opening.id}`,
                position: parsed.finalFen,
                allowDragging: false,
                showAnimations: false,
                boardStyle: {},
              }}
            />
          </div>
        </div>
        
        {/* Action buttons moved to top right corner of the board */}
        {!isDeleteMode && (
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              disabled={isSaving}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(opening)
              }}
              aria-label={`Редактировать дебют ${opening.name}`}
              className="rounded-lg bg-background/90 p-2 text-foreground backdrop-blur-sm transition hover:bg-accent hover:text-accent-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isSaving}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                void onDelete(opening.id)
              }}
              aria-label={`Удалить дебют ${opening.name}`}
              className="rounded-lg bg-background/90 p-2 text-foreground backdrop-blur-sm transition hover:bg-error hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div 
        className="flex flex-1 flex-col gap-2 p-4"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div className="flex items-start gap-2">
          <h3 className="text-base font-semibold leading-tight text-pretty text-card-foreground w-full">
            {opening.name}
          </h3>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {opening.description || "Без описания"}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            {parsed.fullMoveCount} {pluralMoves(parsed.fullMoveCount)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {updatedLabel}
          </span>
          {!parsed.valid && (
            <span className="inline-flex items-center rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-medium text-error">
              Неверный PGN
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function pluralMoves(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "ход"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "хода"
  return "ходов"
}
