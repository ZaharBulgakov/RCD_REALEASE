import type { ChessTheme } from "./themes"

export function getStyles(theme: ChessTheme) {
  const accent = theme.systemDesign?.accent ?? "var(--primary)"
  const glow = theme.systemDesign?.accentMuted ?? "transparent"
  const gray700 = theme.systemDesign?.gray700 ?? "var(--border)"
  const gray800 = theme.systemDesign?.gray800 ?? "var(--muted)"

  return {
    // ─── Обводки ───────────────────────────────────────────────

    /** Слабая обводка — инпуты, обычные карточки */
    borderWeak: {
      boxShadow: `0 0 0 1px ${gray700}`
    } as React.CSSProperties,

    /** Средняя обводка — hover состояние */
    borderHover: {
      boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 60%, transparent), 0 0 14px 2px ${glow}`
    } as React.CSSProperties,

    /** Сильная обводка — выбранный элемент */
    borderSelected: {
      boxShadow: `0 0 0 2px ${accent}, 0 0 0 4px color-mix(in srgb, ${accent} 30%, transparent), 0 0 20px 4px ${glow}`
    } as React.CSSProperties,

    /** Акцентная обводка — активная коллекция, важные контейнеры */
    borderAccent: {
      boxShadow: `0 0 0 1px ${accent}, 0 0 24px 6px ${glow}`
    } as React.CSSProperties,

    /** Кнопка с акцентной обводкой (Выбрать, Коллекция и т.д.) */
    borderButton: {
      boxShadow: `0 0 0 1px ${accent}, 0 0 12px 2px ${glow}`
    } as React.CSSProperties,

    // ─── Карточки ──────────────────────────────────────────────

    /** Обычная карточка */
card: {
  boxShadow: `0 0 0 1px ${accent}, 0 0 16px 2px ${glow}`
} as React.CSSProperties,

cardHover: {
  boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 60%, transparent), 0 0 20px 4px ${glow}`
} as React.CSSProperties,

    /** Карточка выбранная (isSelected) */
    cardSelected: {
      boxShadow: [
        `0 0 0 2px ${accent}`,
        `0 0 0 4px color-mix(in srgb, ${accent} 30%, transparent)`,
        `0 0 20px 4px ${glow}`,
      ].join(", ")
    } as React.CSSProperties,

    /** Карточка коллекции */
    collectionCard: {
      boxShadow: `0 0 0 1px ${gray700}`
    } as React.CSSProperties,

    /** Хедер активной коллекции */
    collectionHeader: {
      boxShadow: `0 0 0 1px ${accent}, 0 0 24px 6px ${glow}`
    } as React.CSSProperties,

    // ─── Инпуты ────────────────────────────────────────────────

    /** Обычный инпут */
    input: {
      boxShadow: `0 0 0 1px ${gray700}`
    } as React.CSSProperties,

    /** Инпут в фокусе */
    inputFocus: {
      boxShadow: `0 0 0 1px ${accent}, 0 0 0 4px color-mix(in srgb, ${accent} 15%, transparent)`
    } as React.CSSProperties,

    // ─── Модальные окна / Попапы ────────────────────────────────

    /** Диалог / модалка */
    dialog: {
      boxShadow: `0 0 0 1px ${gray700}, 0 25px 60px rgba(0,0,0,0.5)`
    } as React.CSSProperties,

    // ─── Утилиты ───────────────────────────────────────────────

    /** Просто цвета для удобного доступа */
    accent,
    glow,
    gray700,
    gray800,
  }
}

export type AppStyles = ReturnType<typeof getStyles>