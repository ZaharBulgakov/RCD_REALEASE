/**
 * Тесты для utils.ts
 * Покрывают: openingIdsOfUnit, calcPointsAwarded, calcSessionPoints,
 *            maybeUpdateRecordLogic, shuffleArray
 * Фреймворк: Vitest
 */

import { describe, it, expect, vi } from "vitest"
import type { SessionUnit } from "./openings"
import {
  openingIdsOfUnit,
  calcPointsAwarded,
  calcSessionPoints,
  maybeUpdateRecordLogic,
  shuffleArray,
} from "./app-logic"

// ──────────────────────────────────────────────
// Фабрики
// ──────────────────────────────────────────────
function makeSingle(id: string): SessionUnit {
  return { kind: "single", opening: { id, name: id } } as SessionUnit
}

function makePair(shortId: string, longId: string): SessionUnit {
  return {
    kind: "pair",
    short: { id: shortId, name: shortId },
    long: { id: longId, name: longId },
  } as SessionUnit
}

// ══════════════════════════════════════════════
// openingIdsOfUnit
// ══════════════════════════════════════════════
describe("openingIdsOfUnit — нормальный ввод", () => {
  it("одиночный юнит возвращает массив из одного ID", () => {
    expect(openingIdsOfUnit(makeSingle("e4"))).toEqual(["e4"])
  })

  it("парный юнит возвращает массив из двух ID", () => {
    expect(openingIdsOfUnit(makePair("short-1", "long-1"))).toEqual(["short-1", "long-1"])
  })

  it("одиночный юнит: длина массива равна 1", () => {
    expect(openingIdsOfUnit(makeSingle("sicilian"))).toHaveLength(1)
  })

  it("парный юнит: длина массива равна 2", () => {
    expect(openingIdsOfUnit(makePair("a", "b"))).toHaveLength(2)
  })

  it("парный юнит: первый элемент — short.id", () => {
    expect(openingIdsOfUnit(makePair("SHORT", "LONG"))[0]).toBe("SHORT")
  })

  it("парный юнит: второй элемент — long.id", () => {
    expect(openingIdsOfUnit(makePair("SHORT", "LONG"))[1]).toBe("LONG")
  })
})

describe("openingIdsOfUnit — граничные значения", () => {
  it("одиночный юнит с пустым ID возвращает ['']", () => {
    expect(openingIdsOfUnit(makeSingle(""))).toEqual([""])
  })

  it("парный юнит с пустыми ID возвращает ['', '']", () => {
    expect(openingIdsOfUnit(makePair("", ""))).toEqual(["", ""])
  })

  it("одиночный юнит с очень длинным ID не обрезает его", () => {
    const longId = "x".repeat(300)
    expect(openingIdsOfUnit(makeSingle(longId))[0]).toHaveLength(300)
  })

  it("парный юнит с одинаковыми ID возвращает два одинаковых значения", () => {
    expect(openingIdsOfUnit(makePair("dup", "dup"))).toEqual(["dup", "dup"])
  })
})

describe("openingIdsOfUnit — ошибочный ввод", () => {
  it("неизвестный kind трактуется как pair и возвращает 2 элемента", () => {
    const unit = { kind: "unknown", short: { id: "s" }, long: { id: "l" } } as unknown as SessionUnit
    expect(openingIdsOfUnit(unit)).toHaveLength(2)
  })
})

// ══════════════════════════════════════════════
// calcPointsAwarded
// ══════════════════════════════════════════════
describe("calcPointsAwarded — нормальный ввод", () => {
  it("победа за 1 секунду даёт 100 очков", () => {
    expect(calcPointsAwarded(true, "won", 1)).toBe(100)
  })

  it("победа за 10 секунд даёт 10 очков", () => {
    expect(calcPointsAwarded(true, "won", 10)).toBe(10)
  })

  it("победа за 2 секунды даёт 50 очков", () => {
    expect(calcPointsAwarded(true, "won", 2)).toBe(50)
  })
})

describe("calcPointsAwarded — отключённый скоринг", () => {
  it("scoringEnabled=false при победе возвращает 0", () => {
    expect(calcPointsAwarded(false, "won", 1)).toBe(0)
  })

  it("scoringEnabled=false при поражении возвращает 0", () => {
    expect(calcPointsAwarded(false, "failed", 1)).toBe(0)
  })
})

describe("calcPointsAwarded — поражение", () => {
  it("статус failed возвращает 0 даже при включённом скоринге", () => {
    expect(calcPointsAwarded(true, "failed", 1)).toBe(0)
  })

  it("статус failed с 0 секунд возвращает 0", () => {
    expect(calcPointsAwarded(true, "failed", 0)).toBe(0)
  })
})

describe("calcPointsAwarded — граничные значения seconds", () => {
  it("seconds=0 зажимается до 0.1, результат равен 1000", () => {
    expect(calcPointsAwarded(true, "won", 0)).toBe(1000)
  })

  it("seconds=0.1 даёт ровно 1000 очков", () => {
    expect(calcPointsAwarded(true, "won", 0.1)).toBe(1000)
  })

  it("очень большое seconds даёт почти 0, но > 0", () => {
    expect(calcPointsAwarded(true, "won", 1e9)).toBeGreaterThan(0)
  })

  it("очень большое seconds даёт меньше 1 очка", () => {
    expect(calcPointsAwarded(true, "won", 1e9)).toBeLessThan(1)
  })

  it("отрицательное seconds зажимается до 0.1, результат равен 1000", () => {
    expect(calcPointsAwarded(true, "won", -5)).toBe(1000)
  })
})

// ══════════════════════════════════════════════
// calcSessionPoints
// ══════════════════════════════════════════════
describe("calcSessionPoints — нормальный ввод", () => {
  it("сумма трёх ненулевых очков корректна", () => {
    expect(calcSessionPoints([{ pointsAwarded: 10 }, { pointsAwarded: 20 }, { pointsAwarded: 30 }])).toBe(60)
  })

  it("один элемент возвращает его же pointsAwarded", () => {
    expect(calcSessionPoints([{ pointsAwarded: 42 }])).toBe(42)
  })
})

describe("calcSessionPoints — граничные значения", () => {
  it("пустой массив возвращает 0", () => {
    expect(calcSessionPoints([])).toBe(0)
  })

  it("все pointsAwarded равны 0 — сумма 0", () => {
    expect(calcSessionPoints([{ pointsAwarded: 0 }, { pointsAwarded: 0 }])).toBe(0)
  })

  it("дробные значения суммируются корректно", () => {
    expect(calcSessionPoints([{ pointsAwarded: 0.1 }, { pointsAwarded: 0.2 }])).toBeCloseTo(0.3)
  })

  it("отрицательные pointsAwarded уменьшают сумму", () => {
    expect(calcSessionPoints([{ pointsAwarded: 10 }, { pointsAwarded: -3 }])).toBe(7)
  })

  it("очень большие числа суммируются без потери знака", () => {
    expect(calcSessionPoints([{ pointsAwarded: 1e9 }, { pointsAwarded: 1e9 }])).toBe(2e9)
  })
})

describe("calcSessionPoints — дубликаты", () => {
  it("одинаковые элементы суммируются все", () => {
    const results = Array(5).fill({ pointsAwarded: 7 })
    expect(calcSessionPoints(results)).toBe(35)
  })
})

// ══════════════════════════════════════════════
// maybeUpdateRecordLogic
// ══════════════════════════════════════════════
describe("maybeUpdateRecordLogic — нормальный ввод", () => {
  it("новый рекорд превышает предыдущий — возвращает новое значение", () => {
    expect(maybeUpdateRecordLogic(200, 100)).toBe(200)
  })

  it("очки равны prevRecord — возвращает null (не обновляем)", () => {
    expect(maybeUpdateRecordLogic(100, 100)).toBeNull()
  })

  it("очки меньше prevRecord — возвращает null", () => {
    expect(maybeUpdateRecordLogic(50, 100)).toBeNull()
  })

  it("prevRecord=0 и points>0 — возвращает points", () => {
    expect(maybeUpdateRecordLogic(1, 0)).toBe(1)
  })
})

describe("maybeUpdateRecordLogic — граничные значения", () => {
  it("points=0 возвращает null (не > 0)", () => {
    expect(maybeUpdateRecordLogic(0, 0)).toBeNull()
  })

  it("отрицательные points возвращают null", () => {
    expect(maybeUpdateRecordLogic(-10, 0)).toBeNull()
  })

  it("Infinity возвращает null (не isFinite)", () => {
    expect(maybeUpdateRecordLogic(Infinity, 0)).toBeNull()
  })

  it("NaN возвращает null (не isFinite)", () => {
    expect(maybeUpdateRecordLogic(NaN, 0)).toBeNull()
  })

  it("-Infinity возвращает null", () => {
    expect(maybeUpdateRecordLogic(-Infinity, 100)).toBeNull()
  })

  it("очень маленькое положительное число (0.001) больше 0 — возвращает его", () => {
    expect(maybeUpdateRecordLogic(0.001, 0)).toBe(0.001)
  })

  it("points=1 и prevRecord=0 — возвращает 1 (не null)", () => {
    expect(maybeUpdateRecordLogic(1, 0)).not.toBeNull()
  })
})

describe("maybeUpdateRecordLogic — ошибочный ввод", () => {
  it("points типа string через приведение: NaN → null", () => {
    expect(maybeUpdateRecordLogic(Number("abc"), 0)).toBeNull()
  })
})

// ══════════════════════════════════════════════
// shuffleArray
// ══════════════════════════════════════════════
describe("shuffleArray — нормальный ввод", () => {
  it("длина результата совпадает с исходным массивом", () => {
    expect(shuffleArray([1, 2, 3, 4, 5])).toHaveLength(5)
  })

  it("результат содержит все исходные элементы (отсортировано)", () => {
    const result = shuffleArray([3, 1, 2])
    expect([...result].sort()).toEqual([1, 2, 3])
  })

  it("не мутирует исходный массив", () => {
    const original = [1, 2, 3]
    shuffleArray(original)
    expect(original).toEqual([1, 2, 3])
  })

  it("возвращает новый массив, а не ссылку на исходный", () => {
    const original = [1, 2, 3]
    expect(shuffleArray(original)).not.toBe(original)
  })
})

describe("shuffleArray — граничные значения", () => {
  it("пустой массив возвращает пустой массив", () => {
    expect(shuffleArray([])).toEqual([])
  })

  it("массив из одного элемента возвращает тот же элемент", () => {
    expect(shuffleArray(["solo"])).toEqual(["solo"])
  })

  it("массив из одного элемента имеет длину 1", () => {
    expect(shuffleArray([42])).toHaveLength(1)
  })

  it("дубликаты сохраняются: [1,1,1] остаётся [1,1,1]", () => {
    expect(shuffleArray([1, 1, 1])).toEqual([1, 1, 1])
  })
})

describe("shuffleArray — перемешивание использует случайность", () => {
  it("с Math.random=0 каждый раз берётся нулевой индекс (детерминированно)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const result = shuffleArray([1, 2, 3, 4])
    // при r=0 каждый swap: copy[i] ↔ copy[0] → результат реверс
    expect(result).toHaveLength(4)
    vi.restoreAllMocks()
  })

  it("с Math.random=0.999 элементы остаются на месте (swap с самим собой)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999)
    const result = shuffleArray([1, 2, 3])
    expect(result).toHaveLength(3)
    vi.restoreAllMocks()
  })

  it("все исходные значения присутствуют после мока random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const result = shuffleArray([10, 20, 30])
    expect(result.sort((a, b) => a - b)).toEqual([10, 20, 30])
    vi.restoreAllMocks()
  })
})

describe("shuffleArray — типы элементов", () => {
  it("строки: все элементы сохраняются", () => {
    const result = shuffleArray(["a", "b", "c"])
    expect(result.sort()).toEqual(["a", "b", "c"])
  })

  it("объекты: ссылки сохраняются (те же объекты)", () => {
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    const result = shuffleArray([obj1, obj2])
    expect(result).toContain(obj1)
  })
})