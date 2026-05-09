"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

// Загружаем один раз на уровне модуля — все карточки используют один chunk
const Chessboard = dynamic(
  async () => {
    const { Chessboard } = await import("react-chessboard")
    return { default: Chessboard }
  },
  {
    ssr: false,
    // Показываем заглушку пока chunk грузится — убирает "пустое место"
    loading: () => (
      <div className="w-full aspect-square bg-muted/30 animate-pulse rounded" />
    ),
  }
)

type Props = {
  options?: {
    position?: string
    allowDragging?: boolean
    animationDurationInMs?: number
    onPieceDrop?: (args: { piece: any; sourceSquare: string; targetSquare: string | null }) => boolean
    onSquareClick?: (args: { piece: any; square: string }) => void
    [key: string]: any
  }
  orientation: "white" | "black"
  boardLight?: string
  boardDark?: string
}

export function BoardWithCoords({ options, orientation, boardLight, boardDark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Сразу читаем размер — не ждём следующего тика
    const initialWidth = el.getBoundingClientRect().width
    if (initialWidth > 0) setBoardWidth(initialWidth)

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setBoardWidth(prev => width !== prev ? width : prev)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const files = orientation === "white"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"]

  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: "1.25rem minmax(0,1fr) 1.25rem",
        gridTemplateRows: "1.25rem auto 1.25rem",
      }}
    >
      <div aria-hidden />
      <div aria-hidden className="grid grid-cols-8 items-end pb-0.5 font-mono text-[11px] leading-none text-muted-foreground">
        {files.map((f) => <span key={`top-${f}`} className="text-center uppercase">{f}</span>)}
      </div>
      <div aria-hidden />

      <div aria-hidden className="grid grid-rows-8 items-center justify-end pr-1 font-mono text-[11px] leading-none text-muted-foreground">
        {ranks.map((r) => <span key={`l-${r}`} className="text-right tabular-nums">{r}</span>)}
      </div>

      <div ref={containerRef} className="min-w-0">
        {boardWidth > 0 ? (
          <Chessboard
            key={orientation}
            options={{
              boardOrientation: orientation,
              position: options?.position || "start",
              showNotation: false,
              boardStyle: { width: `${boardWidth}px`, height: `${boardWidth}px`, ...options?.boardStyle },
              darkSquareStyle: { backgroundColor: boardDark ?? "var(--board-dark)" },
              lightSquareStyle: { backgroundColor: boardLight ?? "var(--board-light)" },
              onPieceDrop: options?.onPieceDrop,
              allowDragging: options?.allowDragging !== false,
              animationDurationInMs: options?.animationDurationInMs ?? 200,
            }}
          />
        ) : (
          <div className="w-full aspect-square bg-muted/20 rounded" />
        )}
      </div>

      <div aria-hidden className="grid grid-rows-8 items-center justify-start pl-1 font-mono text-[11px] leading-none text-muted-foreground">
        {ranks.map((r) => <span key={`r-${r}`} className="text-left tabular-nums">{r}</span>)}
      </div>

      <div aria-hidden />
      <div aria-hidden className="grid grid-cols-8 items-start pt-0.5 font-mono text-[11px] leading-none text-muted-foreground">
        {files.map((f) => <span key={`bot-${f}`} className="text-center uppercase">{f}</span>)}
      </div>
      <div aria-hidden />
    </div>
  )
}
