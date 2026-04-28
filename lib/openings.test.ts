import { describe, it, expect } from "vitest"
import { parsePgn, buildSession, findOpeningPairs } from "./openings"

describe("openings integration (core logic)", () => {
  it("correctly parses valid PGN with moves", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6"
    const parsed = parsePgn(pgn)
    expect(parsed.valid).toBe(true)
    expect(parsed.moves).toEqual(["e4", "e5", "Nf3", "Nc6"])
    expect(parsed.moveCount).toBe(4)
    expect(parsed.fullMoveCount).toBe(2)
  })

  it("fails on invalid PGN", () => {
    const pgn = "invalid-pgn-string"
    const parsed = parsePgn(pgn)
    expect(parsed.valid).toBe(false)
    expect(parsed.error).toBeDefined()
  })

  it("builds a session from openings list", () => {
    const openings = [
      { id: "1", name: "A", pgn: "1. e4", description: "", createdAt: 0 },
      { id: "2", name: "B", pgn: "1. d4", description: "", createdAt: 0 },
    ]
    const session = buildSession(openings, { count: 2, advanced: false })
    expect(session).toHaveLength(2)
    expect(session[0].kind).toBe("single")
  })

  it("finds opening pairs (advanced mode logic)", () => {
    const openings = [
      { id: "1", name: "Short", pgn: "1. e4 e5", description: "", createdAt: 0 },
      { id: "2", name: "Long", pgn: "1. e4 e5 2. Nf3 Nc6", description: "", createdAt: 0 },
    ]
    const pairs = findOpeningPairs(openings)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].short.id).toBe("1")
    expect(pairs[0].long.id).toBe("2")
  })
})
