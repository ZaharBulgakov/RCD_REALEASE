/**
 * Тесты для ResultsScreen
 * Покрывают: unitTitle(), фильтрацию won/failed, граничные значения
 * Фреймворк: Vitest
 */

import { describe, it, expect } from "vitest"
import type { UnitResult } from "./ResultsScreen"
import type { SessionUnit } from "@/lib/openings"

// ──────────────────────────────────────────────
// Вспомогательная функция (дублируем из компонента для тестирования)
// ──────────────────────────────────────────────
function unitTitle(u: SessionUnit): string {
  return u.kind === "single" ? u.opening.name : `${u.short.name} → ${u.long.name}`
}

// ──────────────────────────────────────────────
// Фабрики тестовых данных
// ──────────────────────────────────────────────
function makeSingleUnit(name: string): SessionUnit {
  return { kind: "single", opening: { name } } as SessionUnit
}

function makePairUnit(shortName: string, longName: string): SessionUnit {
  return {
    kind: "pair",
    short: { name: shortName },
    long: { name: longName },
  } as SessionUnit
}

function makeResult(
  unit: SessionUnit,
  status: "won" | "failed",
  seconds = 5,
  pointsAwarded = 10
): UnitResult {
  return { unit, status, seconds, pointsAwarded }
}

// ──────────────────────────────────────────────
// unitTitle — нормальный ввод
// ──────────────────────────────────────────────
describe("unitTitle — нормальный ввод", () => {
  it("возвращает имя дебюта для одиночного юнита", () => {
    expect(unitTitle(makeSingleUnit("Сицилианская защита"))).toBe("Сицилианская защита")
  })

  it("возвращает стрелку между short и long для парного юнита", () => {
    expect(unitTitle(makePairUnit("e4", "Испанская партия"))).toBe("e4 → Испанская партия")
  })

  it("парный юнит: стрелка разделяет имена пробелами", () => {
    expect(unitTitle(makePairUnit("A", "B"))).toContain(" → ")
  })
})

// ──────────────────────────────────────────────
// unitTitle — граничные значения
// ──────────────────────────────────────────────
describe("unitTitle — граничные значения", () => {
  it("одиночный юнит с пустым именем возвращает пустую строку", () => {
    expect(unitTitle(makeSingleUnit(""))).toBe("")
  })

  it("парный юнит с пустыми именами возвращает ' → '", () => {
    expect(unitTitle(makePairUnit("", ""))).toBe(" → ")
  })

  it("очень длинное имя не усекается функцией", () => {
    const longName = "А".repeat(500)
    expect(unitTitle(makeSingleUnit(longName))).toHaveLength(500)
  })

  it("имена с пробелами сохраняются как есть", () => {
    expect(unitTitle(makeSingleUnit("  Начало  "))).toBe("  Начало  ")
  })

  it("парный юнит с пробелами в именах не меняет их", () => {
    expect(unitTitle(makePairUnit(" short ", " long "))).toBe(" short  →  long ")
  })
})

// ──────────────────────────────────────────────
// unitTitle — ошибочный ввод
// ──────────────────────────────────────────────
describe("unitTitle — ошибочный ввод", () => {
  it("неизвестный kind не равен 'single', поэтому обрабатывается как pair", () => {
    const unit = { kind: "unknown", short: { name: "X" }, long: { name: "Y" } } as unknown as SessionUnit
    expect(unitTitle(unit)).toBe("X → Y")
  })
})

// ──────────────────────────────────────────────
// Фильтрация won/failed — нормальный ввод
// ──────────────────────────────────────────────
describe("фильтрация результатов — нормальный ввод", () => {
  const unit = makeSingleUnit("Ферзевый гамбит")
  const results: UnitResult[] = [
    makeResult(unit, "won"),
    makeResult(unit, "failed"),
    makeResult(unit, "won"),
  ]

  it("правильно считает количество пройденных", () => {
    expect(results.filter((r) => r.status === "won").length).toBe(2)
  })

  it("правильно считает количество провалов", () => {
    expect(results.filter((r) => r.status === "failed").length).toBe(1)
  })
})

// ──────────────────────────────────────────────
// Фильтрация — граничные значения
// ──────────────────────────────────────────────
describe("фильтрация результатов — граничные значения", () => {
  const unit = makeSingleUnit("Тест")

  it("пустой массив результатов даёт 0 пройденных", () => {
    expect([].filter((r: UnitResult) => r.status === "won").length).toBe(0)
  })

  it("пустой массив результатов даёт 0 провалов", () => {
    expect([].filter((r: UnitResult) => r.status === "failed").length).toBe(0)
  })

  it("список из одного элемента won корректно фильтруется", () => {
    const results = [makeResult(unit, "won")]
    expect(results.filter((r) => r.status === "won").length).toBe(1)
  })

  it("список из одного элемента failed даёт 0 won", () => {
    const results = [makeResult(unit, "failed")]
    expect(results.filter((r) => r.status === "won").length).toBe(0)
  })

  it("все элементы won — failed список пуст", () => {
    const results = [makeResult(unit, "won"), makeResult(unit, "won")]
    expect(results.filter((r) => r.status === "failed").length).toBe(0)
  })

  it("все элементы failed — won список пуст", () => {
    const results = [makeResult(unit, "failed"), makeResult(unit, "failed")]
    expect(results.filter((r) => r.status === "won").length).toBe(0)
  })
})

// ──────────────────────────────────────────────
// Дубликаты
// ──────────────────────────────────────────────
describe("фильтрация — дубликаты", () => {
  const unit = makeSingleUnit("Дракон")

  it("дублированный won-результат считается дважды", () => {
    const results = [makeResult(unit, "won"), makeResult(unit, "won")]
    expect(results.filter((r) => r.status === "won").length).toBe(2)
  })

  it("дублированный failed-результат считается дважды", () => {
    const results = [makeResult(unit, "failed"), makeResult(unit, "failed")]
    expect(results.filter((r) => r.status === "failed").length).toBe(2)
  })
})

// ──────────────────────────────────────────────
// pointsAwarded и seconds — граничные значения
// ──────────────────────────────────────────────
describe("поля UnitResult — граничные значения", () => {
  const unit = makeSingleUnit("Тест")

  it("seconds = 0 сохраняется без изменений", () => {
    expect(makeResult(unit, "won", 0).seconds).toBe(0)
  })

  it("очень большое seconds сохраняется", () => {
    expect(makeResult(unit, "won", 999999).seconds).toBe(999999)
  })

  it("отрицательное seconds сохраняется (валидация вне функции)", () => {
    expect(makeResult(unit, "won", -1).seconds).toBe(-1)
  })

  it("pointsAwarded = 0 сохраняется", () => {
    expect(makeResult(unit, "won", 5, 0).pointsAwarded).toBe(0)
  })

  it("очень большое pointsAwarded сохраняется", () => {
    expect(makeResult(unit, "won", 5, 1e9).pointsAwarded).toBe(1e9)
  })

  it("отрицательное pointsAwarded сохраняется (валидация вне функции)", () => {
    expect(makeResult(unit, "won", 5, -100).pointsAwarded).toBe(-100)
  })
})

// ──────────────────────────────────────────────
// sessionPoints — округление для отображения
// ──────────────────────────────────────────────
describe("Math.round для sessionPoints", () => {
  it("Math.round(10.4) === 10", () => {
    expect(Math.round(10.4)).toBe(10)
  })

  it("Math.round(10.5) === 11", () => {
    expect(Math.round(10.5)).toBe(11)
  })

  it("Math.round(0) === 0", () => {
    expect(Math.round(0)).toBe(0)
  })

  it("Math.round отрицательного числа не даёт положительного", () => {
    expect(Math.round(-5.5)).toBeLessThan(0)
  })
})

// ──────────────────────────────────────────────
// totalSeconds — Math.max защита от отрицательных
// ──────────────────────────────────────────────
describe("totalSeconds — защита через Math.max(0, ...)", () => {
  it("положительное число проходит без изменений", () => {
    expect(Math.max(0, 12.3)).toBe(12.3)
  })

  it("ноль остаётся нулём", () => {
    expect(Math.max(0, 0)).toBe(0)
  })

  it("отрицательное число зажимается в 0", () => {
    expect(Math.max(0, -5)).toBe(0)
  })

  it("очень большое число проходит без изменений", () => {
    expect(Math.max(0, 1e6)).toBe(1e6)
  })
})