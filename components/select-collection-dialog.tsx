"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Collection } from "@/lib/openings"
import { Search, FolderPlus } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  selectedOpeningIds: Set<string>
  onConfirm: (collectionId: string) => Promise<void>
  isSaving?: boolean
}

export function SelectCollectionDialog({ 
  open, 
  onOpenChange, 
  collections, 
  selectedOpeningIds, 
  onConfirm, 
  isSaving = false 
}: Props) {
  const [query, setQuery] = useState("")
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return collections

    return collections.filter((c) => 
      c.name.toLowerCase().includes(q)
    )
  }, [collections, query])

  async function handleConfirm() {
    if (!selectedCollectionId) return
    await onConfirm(selectedCollectionId)
    onOpenChange(false)
    setSelectedCollectionId("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить в коллекцию</DialogTitle>
          <DialogDescription>
            Выберите коллекцию, куда добавить {selectedOpeningIds.size} дебютов.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSaving}
              placeholder="Поиск по названию..."
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {collections.length === 0 ? "Нет коллекций" : "Коллекции не найдены"}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-accent/50"
                  >
                    <input
                      type="radio"
                      name="collection"
                      checked={selectedCollectionId === collection.id}
                      onChange={() => setSelectedCollectionId(collection.id)}
                      disabled={isSaving}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="flex min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {collection.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {collection.openingIds.length} дебютов
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-10 rounded-md border border-border bg-transparent px-4 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedCollectionId || isSaving}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? "Сохранение..." : (
              <>
                <FolderPlus className="h-4 w-4" />
                Добавить
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
