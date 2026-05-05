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

export function AddOpeningDialog({ open, onOpenChange, onSave, initialOpening, parentPgn, parentId, isSaving = false, currentTheme }: Props) {
  const isEditMode = Boolean(initialOpening)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-wide p-0 bg-card border-border rounded-2xl shadow-2xl overflow-x-hidden">
        <VisuallyHidden>
          <DialogTitle>
            {isEditMode ? "Редактировать дебют" : "Добавить новый дебют"}
          </DialogTitle>
        </VisuallyHidden>
        <div className="p-5 w-full overflow-x-hidden">
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
      </DialogContent>
    </Dialog>
  )
}