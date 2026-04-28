/**
 * Тесты для бизнес-логики приложения
 * Запуск: npm test
 */

import { describe, it, expect } from "vitest"
import { 
  openingIdsOfUnit, 
  calcPointsAwarded, 
  calcSessionPoints, 
  maybeUpdateRecordLogic, 
  shuffleArray 
} from "../lib/app-logic"
import { type SessionUnit } from "../lib/openings"

// ─────────────────────────────────────────────────────────────
// Тест 1: openingIdsOfUnit — извлечение ID из юнита сессии
// ─────────────────────────────────────────────────────────────
describe("openingIdsOfUnit", () => {
  it("возвращает один ID для юнита kind=single", () => {
    const unit: SessionUnit = { 
      kind: "single", 
      opening: { id: "abc", name: "Сицилианская", description: "", pgn: "", createdAt: 0 } 
    }
    expect(openingIdsOfUnit(unit)).toEqual(["abc"])
  })

  it("возвращает два ID для юнита kind=pair", () => {
    const unit: SessionUnit = {
      kind: "pair",
      short: { id: "id-1", name: "Короткий", description: "", pgn: "", createdAt: 0 },
      long: { id: "id-2", name: "Длинный", description: "", pgn: "", createdAt: 0 },
    }
    expect(openingIdsOfUnit(unit)).toEqual(["id-1", "id-2"])
  })
})

// ─────────────────────────────────────────────────────────────
// Тест 2: calcPointsAwarded — начисление очков за раунд
// ─────────────────────────────────────────────────────────────
describe("calcPointsAwarded", () => {
  it("начисляет очки при победе и включённом скоринге", () => {
    const points = calcPointsAwarded(true, "won", 5)
    expect(points).toBeCloseTo(20) // 100 / 5 = 20
  })

  it("начисляет 0 при поражении, даже если скоринг включён", () => {
    expect(calcPointsAwarded(true, "failed", 5)).toBe(0)
  })

  it("начисляет 0 при отключённом скоринге, даже при победе", () => {
    expect(calcPointsAwarded(false, "won", 2)).toBe(0)
  })

  it("защищён от деления на ноль — секунды = 0", () => {
    const points = calcPointsAwarded(true, "won", 0)
    expect(points).toBeCloseTo(1000) // 100 / 0.1 = 1000
  })
})

// ─────────────────────────────────────────────────────────────
// Тест 3: calcSessionPoints — сумма очков за сессию
// ─────────────────────────────────────────────────────────────
describe("calcSessionPoints", () => {
  it("суммирует очки всех раундов", () => {
    const results = [
      { pointsAwarded: 20 },
      { pointsAwarded: 50 },
      { pointsAwarded: 0 },
    ]
    expect(calcSessionPoints(results)).toBeCloseTo(70)
  })

  it("возвращает 0 для пустого массива результатов", () => {
    expect(calcSessionPoints([])).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────
// Тест 4: maybeUpdateRecordLogic — логика обновления рекорда
// ─────────────────────────────────────────────────────────────
describe("maybeUpdateRecordLogic", () => {
  it("обновляет рекорд если новые очки больше старых", () => {
    expect(maybeUpdateRecordLogic(150, 100)).toBe(150)
  })

  it("не обновляет рекорд если новые очки равны старым", () => {
    expect(maybeUpdateRecordLogic(100, 100)).toBeNull()
  })

  it("не обновляет рекорд если новые очки меньше старых", () => {
    expect(maybeUpdateRecordLogic(50, 100)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
// Тест 5: shuffleArray — перемешивание массива (Фишер-Йетс)
// ─────────────────────────────────────────────────────────────
describe("shuffleArray", () => {
  it("возвращает массив той же длины", () => {
    const arr = ["a", "b", "c", "d", "e"]
    expect(shuffleArray(arr)).toHaveLength(arr.length)
  })

  it("содержит те же элементы что и оригинал", () => {
    const arr = ["a", "b", "c", "d", "e"]
    const shuffled = shuffleArray(arr)
    expect(shuffled.sort()).toEqual([...arr].sort())
  })

  it("не мутирует оригинальный массив", () => {
    const arr = ["a", "b", "c"]
    const original = [...arr]
    shuffleArray(arr)
    expect(arr).toEqual(original)
  })
})
