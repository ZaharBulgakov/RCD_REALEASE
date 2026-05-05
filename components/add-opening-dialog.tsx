"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { type Opening } from "@/lib/openings"
import { AddOpeningForm } from "./add-opening-form"
import { type ChessTheme } from "@/lib/themes"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (opening: Opening) => Promise<string | null>
  initialOpening?: Opening | null
  parentPgn?: string
  parentId?: string
  isSaving?: boolean
  currentTheme?: ChessTheme
}

export function AddOpeningDialog({
  open,
  onOpenChange,
  onSave,
  initialOpening,
  parentPgn,
  parentId,
  isSaving = false,
  currentTheme,
}: Props) {
  const isEditMode = Boolean(initialOpening)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          // Мобильный: на весь экран снизу вверх (drawer-like)
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "max-h-[95dvh] w-full rounded-t-2xl rounded-b-none",
          // sm+: стандартный центрированный диалог
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-2xl",
          // общее
          "flex flex-col overflow-hidden p-0 bg-card border-border shadow-2xl",
        ].join(" ")}
      >
        <VisuallyHidden>
          <DialogTitle>
            {isEditMode ? "Редактировать дебют" : "Добавить новый дебют"}
          </DialogTitle>
        </VisuallyHidden>

        {/* Drag handle для мобильного */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Скролируемое содержимое */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 w-full">
            <AddOpeningForm
              onSave={onSave}
              initialOpening={initialOpening}
              parentPgn={parentPgn}
              parentId={parentId}
              onCancel={() => onOpenChange(false)}
              isSaving={isSaving}
              currentTheme={currentTheme}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
