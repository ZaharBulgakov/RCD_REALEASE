"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { History, RotateCcw, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Opening } from "@/lib/openings"
import { getStyles } from "@/lib/styles"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}` }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-border bg-card" style={accentGlow}>
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-wider" >
              <History className="h-6 w-6 text-primary" />
              История удалений
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            Восстановите ранее удаленные дебюты и коллекции.
          </p>

          {deletionLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="mb-2 h-10 w-10 opacity-20" />
              <p>История удалений пуста</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Всего удалено: {deletionLogs.length}</span>
                <div className="flex gap-4">
                  <button 
                    onClick={onRestoreAll} 
                    className="hover:text-primary transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    Восстановить всё
                  </button>
                  <button 
                    onClick={onClearAll} 
                    className="hover:text-error transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    Очистить всё
                  </button>
                </div>
              </div>
              <ScrollArea className="h-[400px] -mx-2 px-2">
                <div className="space-y-3">
                  {deletionLogs.map((log) => (
                    <div key={log.id} className="group relative flex items-center justify-between p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/50 transition-all">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm truncate">{log.opening_name || "Без названия"}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                          {new Date(log.deleted_at).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
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
                              createdAt: new Date(log.deleted_at).getTime(),
                              leadingSide: "white"
                            }, true)
                            onOpenChange(false)
                          }}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Просмотреть"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={isSaving}
                          onClick={() => onRestore(log.id)}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Восстановить"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button 
              type="button" 
              disabled={isSaving} 
              onClick={() => onOpenChange(false)} 
              variant="secondary" 
              className="w-full h-12 rounded-xl font-bold uppercase tracking-widest"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
