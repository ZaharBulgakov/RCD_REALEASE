"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Edit2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (description: string) => Promise<void>
  initialDescription: string
  collectionName: string
  isSaving?: boolean
}

export function CollectionDescriptionDialog({
  open,
  onOpenChange,
  onSave,
  initialDescription,
  collectionName,
  isSaving = false
}: Props) {
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    setDescription(initialDescription)
  }, [initialDescription])

  const handleSave = async () => {
    await onSave(description)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setDescription(initialDescription)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Collection Description
          </DialogTitle>
          <DialogDescription>
            Add a description for "{collectionName}". This description will only be visible when viewing this collection.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter collection description..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              className="min-h-[100px] resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length} / 1000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
