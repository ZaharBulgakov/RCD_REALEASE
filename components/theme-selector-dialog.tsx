"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CHESS_THEMES, type ChessTheme } from "@/lib/themes"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTheme: ChessTheme
  onSelect: (theme: ChessTheme) => void
}

import { getStyles } from "@/lib/styles"

export function ThemeSelectorDialog({ open, onOpenChange, currentTheme, onSelect }: Props) {
  const s = getStyles(currentTheme)
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` }

  return (
    
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={accentGlow}>
        <DialogHeader>
          <DialogTitle>Темы</DialogTitle>
          <DialogDescription>
            Выберите цветовую палитру интерфейса
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-4 " >
          {CHESS_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onSelect(theme)
              }}
              className={cn(
                "relative flex flex-col items-center p-2 rounded-xl border-2  transition-all hover:border-primary/50",
                currentTheme.id === theme.id ? "border-primary bg-primary/5" : "border-border bg-muted/50"
              )}
              
            >
              {/* Preview 2x2 */}
              <div className="grid grid-cols-2 w-full aspect-square rounded-lg overflow-hidden mb-2 shadow-sm">
                <div style={{ backgroundColor: theme.light }} />
                <div style={{ backgroundColor: theme.dark }} />
                <div style={{ backgroundColor: theme.dark }} />
                <div style={{ backgroundColor: theme.light }} />
              </div>

              <div className="text-xs font-semibold mb-0.5 flex items-center gap-1">
                <theme.icon className="w-3 h-3 flex-shrink-0" style={{ color: theme.systemDesign?.accent }} />
                <span className="truncate">{theme.name}</span>
              </div>
              <div className="text-[9px] text-muted-foreground text-center leading-tight">
                {theme.description}
              </div>

              {currentTheme.id === theme.id && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 ">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
