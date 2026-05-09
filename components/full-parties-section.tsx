"use client"

import { useMemo, useState, useRef, useCallback } from "react"
import { Search, Plus, X } from "lucide-react"
import { OpeningCard } from "./opening-card"
import { parsePgn, type Opening, type Party } from "@/lib/openings"
import { Button } from "./ui/button"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"

type Props = {
  parties: Party[]
  opening: Opening
  onPartyClick: (party: Party) => void
  onAddParty: () => void
  currentTheme: ChessTheme
  isSaving?: boolean
}

export function FullPartiesSection({
  parties,
  opening,
  onPartyClick,
  onAddParty,
  currentTheme,
  isSaving = false,
}: Props) {
  const [query, setQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)
  const didScroll = useRef(false)
  const SCROLL_THRESHOLD = 10

  const s = getStyles(currentTheme)
  const accentGlow = {
    boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}`,
  }

  const filteredParties = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parties
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.pgn.toLowerCase().includes(q)
    )
  }, [parties, query])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartY.current = touch.clientY
    touchStartX.current = touch.clientX
    didScroll.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const dy = Math.abs(touch.clientY - touchStartY.current)
    const dx = Math.abs(touch.clientX - touchStartX.current)
    if (dy > SCROLL_THRESHOLD || dx > SCROLL_THRESHOLD) {
      didScroll.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!didScroll.current && e.changedTouches.length > 0) {
      const target = e.target as HTMLElement
      const card = target.closest("[data-party-card]")
      if (card) {
        const partyId = card.getAttribute("data-party-id")
        const party = parties.find((p) => p.id === partyId)
        if (party) {
          e.stopPropagation()
          onPartyClick(party)
        }
      }
    }
    didScroll.current = false
  }, [parties, onPartyClick])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    didScroll.current = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1) {
      didScroll.current = true
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!didScroll.current) {
      const target = e.target as HTMLElement
      const card = target.closest("[data-party-card]")
      if (card) {
        const partyId = card.getAttribute("data-party-id")
        const party = parties.find((p) => p.id === partyId)
        if (party) {
          e.stopPropagation()
          onPartyClick(party)
        }
      }
    }
    didScroll.current = false
  }, [parties, onPartyClick])

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 space-y-3 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Полноценные партии
            <span className="ml-2 text-xs text-muted-foreground">({parties.length})</span>
          </h2>
          <Button
            onClick={onAddParty}
            size="sm"
            className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wide"
            style={accentGlow}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Добавить
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск партий..."
            className="h-9 w-full rounded-full border border-border bg-background pl-10 pr-10 text-xs outline-none transition focus:border-primary"
            style={{ userSelect: "none" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
          overscrollBehavior: "contain",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {filteredParties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p className="text-sm">{query ? "Ничего не найдено" : "Нет партий"}</p>
            {!query && (
              <Button
                onClick={onAddParty}
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить первую партию
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {filteredParties.map((party) => (
              <div
                key={party.id}
                data-party-card
                data-party-id={party.id}
                className="cursor-pointer"
              >
                <PartyCard
                  party={party}
                  currentTheme={currentTheme}
                  isSaving={isSaving}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        [data-party-card] {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        [data-party-card]::selection {
          background: transparent;
        }
      `}</style>
    </div>
  )
}

function PartyCard({
  party,
  currentTheme,
  isSaving,
}: {
  party: Party
  currentTheme: ChessTheme
  isSaving?: boolean
}) {
  const parsed = useMemo(() => parsePgn(party.pgn), [party.pgn])
  const s = getStyles(currentTheme)

  const updatedLabel = useMemo(() => {
    const d = new Date(party.createdAt)
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
  }, [party.createdAt])

  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/50
        ${isSaving ? "opacity-60 pointer-events-none" : ""}`}
      style={{
        boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 15%, transparent)`,
      }}
    >
      <div className="aspect-video w-full overflow-hidden bg-muted/30">
        {parsed.valid ? (
          <div className="w-full h-full flex items-center justify-center text-4xl font-black text-primary/20">
            ♟
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-error/60">
            Ошибка PGN
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm line-clamp-1">{party.name}</h3>
        {party.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {party.description}
          </p>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{parsed.fullMoveCount} ходов</span>
          <span>{updatedLabel}</span>
        </div>
      </div>
    </div>
  )
}