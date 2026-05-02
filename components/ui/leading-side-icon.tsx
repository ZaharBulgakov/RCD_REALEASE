import type { LeadingSide } from "@/lib/openings"

type Props = {
  side: LeadingSide
  size?: number
  className?: string
}

export function LeadingSideIcon({ side, size = 18, className = "" }: Props) {
  if (side === "white") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        className={className}
        aria-label="Белые"
      >
        <title>Ведущая сторона: Белые</title>
        <rect x="1" y="1" width="16" height="16" rx="3" fill="white" stroke="#888" strokeWidth="1.5" />
      </svg>
    )
  }

  if (side === "black") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        className={className}
        aria-label="Чёрные"
      >
        <title>Ведущая сторона: Чёрные</title>
        <rect x="1" y="1" width="16" height="16" rx="3" fill="#1a1a1a" stroke="#888" strokeWidth="1.5" />
      </svg>
    )
  }

  // random — диагональный split
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      className={className}
      aria-label="Случайно"
    >
      <title>Ведущая сторона: Случайно</title>
      <defs>
        <clipPath id="rcd-ls-clip">
          <rect x="1" y="1" width="16" height="16" rx="3" />
        </clipPath>
      </defs>
      <polygon points="1,1 17,1 1,17" fill="white" clipPath="url(#rcd-ls-clip)" />
      <polygon points="17,1 17,17 1,17" fill="#1a1a1a" clipPath="url(#rcd-ls-clip)" />
      <line x1="1" y1="17" x2="17" y2="1" stroke="#888" strokeWidth="1" />
      <rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke="#888" strokeWidth="1.5" />
    </svg>
  )
}
