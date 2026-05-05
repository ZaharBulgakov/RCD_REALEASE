"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Delete } from "lucide-react"

type Props = {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onSpace: () => void
  className?: string
}

export function ChessKeyboard({ onKeyPress, onDelete, onSpace, className = "" }: Props) {
  const rows = [
    ["K", "Q", "R", "B", "N", "x"],
    ["a", "b", "c", "d", "e", "f", "g", "h"],
    ["1", "2", "3", "4", "5", "6", "7", "8"],
    ["O-O", "O-O-O", "+", "#", "!", "?"],
  ]

  const [deleteInterval, setDeleteInterval] = useState<NodeJS.Timeout | null>(null)

  const startDeleting = () => {
    onDelete()
    const interval = setInterval(() => {
      onDelete()
    }, 100)
    setDeleteInterval(interval)
  }

  const stopDeleting = () => {
    if (deleteInterval) {
      clearInterval(deleteInterval)
      setDeleteInterval(null)
    }
  }

  useEffect(() => {
    return () => {
      if (deleteInterval) clearInterval(deleteInterval)
    }
  }, [deleteInterval])

  return (
    <div className={`flex flex-col gap-1.5 p-2 bg-muted/30 rounded-xl border-2 border-border shadow-inner w-full ${className}`}>
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 w-full">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key)}
              className="flex-1 h-10 min-w-0 rounded-lg bg-card border-2 border-border text-sm font-bold transition
                hover:bg-accent hover:border-primary active:scale-95 active:bg-accent/70 flex items-center justify-center shadow-sm"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-1 w-full">
        <button
          type="button"
          onClick={onSpace}
          className="flex-[2] h-10 min-w-0 rounded-lg bg-card border-2 border-border text-sm font-bold transition
            hover:bg-accent hover:border-primary active:scale-95 flex items-center justify-center shadow-sm"
        >
          Space
        </button>
        <button
          type="button"
          onMouseDown={startDeleting}
          onMouseUp={stopDeleting}
          onMouseLeave={stopDeleting}
          onTouchStart={(e) => {
            e.preventDefault()
            startDeleting()
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            stopDeleting()
          }}
          className="flex-1 h-10 min-w-0 rounded-lg bg-card border-2 border-border text-foreground font-bold transition
            hover:bg-accent hover:border-primary active:scale-95 flex items-center justify-center shadow-sm"
        >
          <Delete className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
