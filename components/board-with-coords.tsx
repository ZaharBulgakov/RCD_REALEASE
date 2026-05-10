"use client"

import dynamic from "next/dynamic"
// Тип из react-chessboard/dist/types — объявляем локально, т.к. пакет не экспортирует его напрямую
type SquareRenderer = (args: { piece: { pieceType: string } | null; square: string; children?: React.ReactNode }) => React.JSX.Element

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
    onSquareRightClick?: (args: { piece: any; square: string }) => void
    onMouseOverSquare?: (args: { piece: any; square: string }) => void
    onMouseOutSquare?: (args: { piece: any; square: string }) => void
    squareStyles?: Record<string, React.CSSProperties>
    arrows?: any[]
    [key: string]: any
  }
  orientation: "white" | "black"
  boardLight?: string
  boardDark?: string
  squareRenderer?: SquareRenderer
  /** @deprecated используй squareRenderer */
  customSquare?: SquareRenderer
}

export function BoardWithCoords({ options, orientation, boardLight, boardDark, squareRenderer, customSquare }: Props) {
  // customSquare — обратная совместимость со старым API
  const resolvedSquareRenderer = squareRenderer ?? customSquare

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

      <div className="min-w-0">
        <Chessboard
          key={orientation}
          options={{
            boardOrientation: orientation,
            position: options?.position ?? "start",
            showNotation: false,
            darkSquareStyle: { backgroundColor: boardDark ?? "var(--board-dark)" },
            lightSquareStyle: { backgroundColor: boardLight ?? "var(--board-light)" },
            onPieceDrop: options?.onPieceDrop,
            onSquareClick: options?.onSquareClick,
            onSquareRightClick: options?.onSquareRightClick,
            onMouseOverSquare: options?.onMouseOverSquare,
            onMouseOutSquare: options?.onMouseOutSquare,
            squareStyles: options?.squareStyles,
            arrows: options?.arrows,
            squareRenderer: resolvedSquareRenderer,
            allowDragging: options?.allowDragging !== false,
            animationDurationInMs: options?.animationDurationInMs ?? 200,
          }}
        />
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
