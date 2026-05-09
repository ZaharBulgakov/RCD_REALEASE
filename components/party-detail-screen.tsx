"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Pencil, Trash2, BookOpen } from "lucide-react"
import { type Party, parsePgn } from "@/lib/openings"
import { Button } from "./ui/button"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"

type Props = {
  party: Party
  onBack: () => void
  onStudy: (party: Party) => void
  onEdit: (party: Party) => void
  onDelete: (id: string) => Promise<void>
  currentTheme: ChessTheme
  isSaving?: boolean
}

export function PartyDetailScreen({
  party,
  onBack,
  onStudy,
  onEdit,
  onDelete,
  currentTheme,
  isSaving = false,
}: Props) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const s = getStyles(currentTheme)
  const accentGlow = {
    boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}`,
  }

  const parsed = useMemo(() => parsePgn(party.pgn), [party.pgn])

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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-border bg-card/50 px-3 sm:px-6 backdrop-blur-md z-50">
        <Button
          variant="ghost"
          onClick={onBack}
          className="absolute left-3 flex items-center gap-1 rounded-xl font-bold uppercase tracking-wide px-2 sm:px-4 text-[10px] sm:text-xs"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Назад</span>
        </Button>
        <h1 className="text-[16px] sm:text-xl font-black tracking-wide text-primary text-center px-20 truncate">
          {party.name}
        </h1>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 space-y-6" style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}>
          <div className="space-y-4">
            {party.description && (
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {party.description}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Ходов</span>
                  <span className="text-lg font-black text-primary">{parsed.moveCount}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Создано</span>
                  <span className="text-xs font-medium text-muted-foreground">{updatedLabel}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">PGN</span>
                <code className="block text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto font-mono">
                  {party.pgn}
                </code>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => onStudy(party)}
              className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-wide"
              style={accentGlow}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Режим изучения
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(party)}
              className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-wide"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(true)}
              className="h-12 rounded-2xl font-bold uppercase tracking-wide text-error hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Удалить</span>
            </Button>
          </div>
        </main>

        <aside className="md:w-96 md:border-l md:border-border bg-card/20 p-6 shrink-0">
          <div className="space-y-4">
            <div className="aspect-square w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" style={accentGlow}>
              <div className="w-full h-full flex items-center justify-center text-6xl text-primary/30">
                ♟
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black truncate">{party.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Полноценная партия</p>
            </div>
          </div>
        </aside>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-3xl border border-border bg-card p-6 space-y-4" style={accentGlow}>
            <h3 className="text-lg font-bold text-center">Удалить партию?</h3>
            <p className="text-sm text-muted-foreground text-center">
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await onDelete(party.id)
                  setDeleteConfirm(false)
                }}
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}