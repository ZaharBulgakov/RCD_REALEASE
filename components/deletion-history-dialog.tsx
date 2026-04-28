"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { History, RotateCcw, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Opening } from "@/lib/openings"
import { getStyles } from "@/lib/styles"
import type { ChessTheme } from "@/lib/themes"

type DeletionLog = {
  id: string
  opening_id: string
  opening_name: string
  opening_pgn: string
  opening_description: string
  deleted_at: string
}

type Props = {
  currentTheme: ChessTheme
  open: boolean
  onOpenChange: (open: boolean) => void
  deletionLogs: DeletionLog[]
  onRestoreAll: () => void
  onClearAll: () => void
  onRestore: (logId: string) => void
  onStudy: (opening: Opening, fromHistory: boolean) => void
  isSaving?: boolean
}

export function DeletionHistoryDialog(
  {
  open,
  onOpenChange,
  deletionLogs,
  currentTheme,
  onRestoreAll,
  onClearAll,
  onRestore,
  onStudy,
  isSaving = false,
}: Props) {
  const s = getStyles(currentTheme)
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 30%, transparent), 0 0 24px 4px ${s.glow}` }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5" style={accentGlow}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" >
            <History className="h-5 w-5" />
            История удалений
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Восстановите ранее удаленные дебюты
        </p>

        {deletionLogs.length === 0 ? (
          <p className="text-center text-muted-foreground">История удалений пуста.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold uppercase tracking-wider">Всего удалено: {deletionLogs.length}</span>
              <div className="flex gap-3">
                <Button 
                  variant="link" 
                  onClick={onRestoreAll} 
                  className="p-0 h-auto text-xs"
                  disabled={isSaving}
                >
                  {isSaving ? "Восстановление..." : "Восстановить всё"}
                </Button>
                <Button 
                  variant="link" 
                  onClick={onClearAll} 
                  className="p-0 h-auto text-xs text-destructive"
                  disabled={isSaving}
                >
                  Очистить всё
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {deletionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-xl bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm leading-tight">{log.opening_name || "Без названия"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                      Удалено: {new Date(log.deleted_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isSaving}
                      onClick={() => {
                        onStudy({
                          id: log.opening_id,
                          name: log.opening_name,
                          description: log.opening_description,
                          pgn: log.opening_pgn,
                          createdAt: new Date(log.deleted_at).getTime()
                        }, true)
                        onOpenChange(false)
                      }}
                      className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Просмотреть"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isSaving}
                      onClick={() => onRestore(log.id)}
                      className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Восстановить"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button type="button" disabled={isSaving} onClick={() => onOpenChange(false)} variant="secondary" className="rounded-xl">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
