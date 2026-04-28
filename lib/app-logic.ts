import { type SessionUnit } from "./openings"

/**
 * Returns an array of opening IDs from a session unit.
 */
export function openingIdsOfUnit(u: SessionUnit): string[] {
  if (u.kind === "single") return [u.opening.id]
  return [u.short.id, u.long.id]
}

/**
 * Calculates points awarded for a single round.
 */
export function calcPointsAwarded(
  scoringEnabled: boolean,
  status: "won" | "failed",
  seconds: number,
  config: {
    mode: "moves" | "names"
    advanced: boolean
    totalUnits: number
    isCustom: boolean
    moveCount: number
    isRandomColor: boolean
  },
): number {
  if (!scoringEnabled || status !== "won" || config.isCustom) return 0

  // Base points: 100
  let points = 100

  // Multipliers for difficulty
  if (config.mode === "names") {
    points *= 2.0 // Names mode is harder
  } else if (config.advanced) {
    points *= 0.7 // Pairs mode is easier
  } else {
    points *= 1.0 // Normal mode
  }

  if (config.isRandomColor) {
    points *= 1.1 // Slightly more points for random color
  }

  // Multiplier for session length
  // 1 unit = 1.0x, 5 units = 1.2x, 10 units = 1.45x
  const lengthBonus = 1 + (config.totalUnits - 1) * 0.05
  points *= lengthBonus

  // Multiplier for opening length (moveCount is in plies)
  // Standard length is ~10 plies (5 full moves).
  // 4 plies = 0.7x, 10 plies = 1.0x, 20 plies = 1.5x
  const moveBonus = 0.5 + Math.min(1.5, config.moveCount / 10)
  points *= moveBonus

  // Time factor: inversely proportional to time
  return points / Math.max(0.1, seconds)
}

/**
 * Sums up points from all session results.
 */
export function calcSessionPoints(
  results: Array<{ pointsAwarded: number }>,
): number {
  return results.reduce((acc, r) => acc + r.pointsAwarded, 0)
}

/**
 * Business logic for record updates. Returns the next record or null if no update is needed.
 */
export function maybeUpdateRecordLogic(
  points: number,
  prevRecord: number,
): number | null {
  if (!Number.isFinite(points) || points <= 0) return null
  const next = Math.max(prevRecord, points)
  if (next === prevRecord) return null
  return next
}

/**
 * Shuffles an array using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[r]] = [copy[r], copy[i]]
  }
  return copy
}
