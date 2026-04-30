import { Chess } from "chess.js"

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

export const OPENINGS_LIMIT = 1000
export const COLLECTIONS_LIMIT = 100
export const COLLECTION_OPENINGS_LIMIT = 100

export type Opening = {
  id: string
  name: string
  description: string
  pgn: string
  createdAt: number
}

export type Collection = {
  id: string
  name: string
  description: string
  openingIds: string[]
  createdAt: number
}

export type ParsedPgn = {
  moves: string[] // SAN moves in order
  finalFen: string
  moveCount: number // number of plies
  fullMoveCount: number // number of full moves (for display)
  valid: boolean
  error?: string
}

/**
 * Parse a PGN string robustly. Works with short strings / just moves.
 * Returns moves array (SAN), final FEN, and validity.
 */
export function parsePgn(pgn: string): ParsedPgn {
  const empty: ParsedPgn = {
    moves: [],
    finalFen: new Chess().fen(),
    moveCount: 0,
    fullMoveCount: 0,
    valid: false,
  }

  if (!pgn || typeof pgn !== "string") {
    return { ...empty, error: "Empty PGN" }
  }

  const cleaned = pgn.trim()
  if (!cleaned) return { ...empty, error: "Empty PGN" }

  const chess = new Chess()

  // Attempt 1: native loadPgn (handles headers + moves)
  try {
    chess.loadPgn(cleaned, { strict: false })
    const moves = chess.history()
    if (moves.length > 0) {
      return {
        moves,
        finalFen: chess.fen(),
        moveCount: moves.length,
        fullMoveCount: Math.ceil(moves.length / 2),
        valid: true,
      }
    }
  } catch {
    // fall through to manual parse
  }

  // Attempt 2: strip headers, comments, variations, move numbers, result tokens,
  // then feed tokens as SAN moves one by one.
  const stripped = cleaned
    .replace(/\[[^\]]*\]/g, " ") // [Event "..."] headers
    .replace(/\{[^}]*\}/g, " ") // {comments}
    .replace(/;[^\n]*/g, " ") // ; line comments
    .replace(/\$\d+/g, " ") // $nag
    .replace(/\([^)]*\)/g, " ") // simple parenthetical variations
    .replace(/\d+\.(\.\.)?/g, " ") // 1. 1... move numbers
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ") // results
    .replace(/\s+/g, " ")
    .trim()

  if (!stripped) return { ...empty, error: "No moves found" }

  const tokens = stripped.split(" ").filter(Boolean)
  const chess2 = new Chess()
  const applied: string[] = []

  for (const token of tokens) {
    try {
      const mv = chess2.move(token, { strict: false })
      if (mv) applied.push(mv.san)
      else break
    } catch {
      break
    }
  }

  if (applied.length === 0) {
    return { ...empty, error: "No valid moves could be parsed" }
  }

  return {
    moves: applied,
    finalFen: chess2.fen(),
    moveCount: applied.length,
    fullMoveCount: Math.ceil(applied.length / 2),
    valid: true,
  }
}

/**
 * Return the FEN after applying the given SAN moves to a fresh board.
 */
export function fenAfterMoves(moves: string[]): string {
  const chess = new Chess()
  for (const m of moves) {
    try {
      chess.move(m, { strict: false })
    } catch {
      break
    }
  }
  return chess.fen()
}

export function buildSeedOpenings(): Opening[] {
  return [
    {
      id: generateId(),
      name: "Итальянская партия",
      description:
        "Классический открытый дебют. Белые быстро выводят коня и слоника на атакующие позиции, готовя давление на пункт f7.",
      pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4",
      createdAt: Date.now() - 4000,
    },
    {
      id: generateId(),
      name: "Испанская партия",
      description:
        "Один из старейших дебютов. Слон на b5 оказывает давление на коня c6, готовясь к стратегической борьбе в центре.",
      pgn: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O",
      createdAt: Date.now() - 3000,
    },
    {
      id: generateId(),
      name: "Сицилианская защита",
      description:
        "Самый популярный ответ чёрных на 1.e4. Асимметричная структура ведёт к острой и динамичной борьбе.",
      pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
      createdAt: Date.now() - 2000,
    },
    {
      id: generateId(),
      name: "Ферзевый гамбит",
      description:
        "Белые предлагают пешку c4 в обмен на контроль центра. Классический позиционный дебют уровня чемпионатов мира.",
      pgn: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7",
      createdAt: Date.now() - 1000,
    },
    {
      id: generateId(),
      name: "Французская защита",
      description:
        "Солидный ответ чёрных. Пешечная цепь d5-e6 создаёт прочную крепость, из которой чёрные готовят контрудар.",
      pgn: "1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. Bg5",
      createdAt: Date.now(),
    },
  ]
}

/**
 * Pick N random non-repeating openings from the list.
 */
export function pickRandomSession(openings: Opening[], count: number): Opening[] {
  const n = Math.max(1, Math.min(count, openings.length))
  const pool = [...openings]
  const picked: Opening[] = []
  while (picked.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

/* ============================================================
 * Advanced mode — pair detection.
 * A "pair" is two distinct openings A and B where A's SAN move
 * list is a STRICT prefix of B's SAN move list. A becomes the
 * "short" variant, B becomes the "long" variant.
 * ============================================================ */

export type OpeningPair = {
  short: Opening
  long: Opening
}

export type SessionUnit =
  | { kind: "single"; opening: Opening }
  | { kind: "pair"; short: Opening; long: Opening }

function isStrictPrefix(a: string[], b: string[]): boolean {
  if (a.length === 0) return false
  if (a.length >= b.length) return false
  for (let k = 0; k < a.length; k++) {
    if (a[k] !== b[k]) return false
  }
  return true
}

/**
 * Find up to `count` non-overlapping opening pairs (each opening
 * is used at most once). If `count` is undefined, returns as many
 * pairs as the greedy algorithm can discover.
 *
 * When `count` is provided, candidates are shuffled so that the
 * returned pairs vary between runs. When omitted, the result is
 * deterministic and serves as a ceiling for the UI.
 */
export function findOpeningPairs(
  openings: Opening[],
  count?: number,
): OpeningPair[] {
  const items = openings.map((o) => ({
    opening: o,
    moves: parsePgn(o.pgn).moves,
  }))

  const candidates: Array<[number, number]> = []
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue
      if (isStrictPrefix(items[i].moves, items[j].moves)) {
        candidates.push([i, j])
      }
    }
  }

  if (count !== undefined) {
    // Fisher-Yates shuffle for random selection between runs.
    for (let k = candidates.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1))
      ;[candidates[k], candidates[r]] = [candidates[r], candidates[k]]
    }
  } else {
    // Deterministic order — prefer short lines first so the greedy
    // match tends to produce more total pairs.
    candidates.sort(
      (a, b) => items[a[0]].moves.length - items[b[0]].moves.length,
    )
  }

  const used = new Set<number>()
  const result: OpeningPair[] = []
  for (const [i, j] of candidates) {
    if (used.has(i) || used.has(j)) continue
    used.add(i)
    used.add(j)
    result.push({ short: items[i].opening, long: items[j].opening })
    if (count !== undefined && result.length >= count) break
  }
  return result
}

/**
 * Maximum number of non-overlapping pairs that can be formed from
 * the current database. Deterministic — used to cap the user input.
 */
export function countMaxPairs(openings: Opening[]): number {
  return findOpeningPairs(openings).length
}

/**
 * Build the play session for either mode. In advanced mode, returns
 * up to `count` pair units. If fewer pairs can be formed than
 * requested, returns whatever pairs were found. In standard mode,
 * returns exactly N single units (or fewer if the DB is smaller).
 */
export function buildSession(
  openings: Opening[],
  config: { count: number; advanced: boolean },
): SessionUnit[] {
  if (config.advanced) {
    const pairs = findOpeningPairs(openings, config.count)
    return pairs.map<SessionUnit>((p) => ({
      kind: "pair",
      short: p.short,
      long: p.long,
    }))
  }
  const singles = pickRandomSession(openings, config.count)
  return singles.map<SessionUnit>((o) => ({ kind: "single", opening: o }))
}
