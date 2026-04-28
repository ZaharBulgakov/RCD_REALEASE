import { Swords, Globe, Trees, Waves, Gem, Moon, Sun, type LucideIcon } from "lucide-react"

export type ChessTheme = {
  id: string
  name: string
  light: string
  dark: string
  description: string
  icon: LucideIcon
  systemDesign?: {
    accent: string
    accentHover: string
    accentMuted: string
    gold: string
    goldMuted: string
    gray950: string
    gray900: string
    gray850: string
    gray800: string
    gray700: string
    gray600: string
    gray400: string
    gray200: string
    gray50: string
    success: string
    successMuted: string
    error: string
    errorMuted: string
    warning: string
    info: string
    boardLight: string
    boardDark: string
    boardHighlight: string
    boardHint: string
    boardError: string
    cardGlow: string
  }
}

export const CHESS_THEMES: ChessTheme[] = [
  {
    id: "classic",
    name: "Классический",
    light: "#F0D9B5",
    dark: "#B58863",
    description: "Вы эстет?",
    icon: Trees,
    systemDesign: {
      accent: "#ff6a00ff",
      accentHover: "#ff6a00ff",
      accentMuted: "rgba(212, 114, 46, 0.15)",
      gold: "#C8982E",
      goldMuted: "rgba(200, 152, 46, 0.1)",
      gray950: "#ffffffff",
      gray900: "#1A1008",
      gray850: "#251810",
      gray800: "#ff6a00ff",
      gray700: "#803c11ff",
      gray600: "#634030",
      gray400: "#c2a38fff",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(224, 82, 82, 0.15)",
      warning: "#D4922A",
      info: "#5B8DB8",
      boardLight: "#F0D9B5",
      boardDark: "#B58863",
      boardHighlight: "rgba(246, 246, 105, 0.7)",
      boardHint: "rgba(93, 184, 74, 0.45)",
      boardError: "rgba(224, 82, 82, 0.5)",
      cardGlow: "rgba(255, 106, 0, 0.1)",
    }
  },
  {
    id: "combat",
    name: "Боевой",
    light: "#ffdbdbff",
    dark: "#c77f7fff",
    description: "Вы кого-то превзойдете?",
    icon: Swords,
    systemDesign: {
      accent: "#fd4040ff",
      accentHover: "#ff2020ff",
      accentMuted: "rgba(232, 54, 10, 0.15)",
      gold: "#C9922A",
      goldMuted: "rgba(201, 146, 42, 0.1)",
      gray950: "#ffffffff",
      gray900: "#180606ff",
      gray850: "#1d1010ff",
      gray800: "#fd4040ff",
      gray700: "#9e2525ff",
      gray600: "#543232ff",
      gray400: "rgba(206, 171, 171, 1)",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(255, 0, 0, 0.15)",
      warning: "#F59E0B",
      info: "#3B82F6",
      boardLight: "#ffdbdbff",
      boardDark: "#c77f7fff",
      boardHighlight: "rgba(246, 246, 105, 0.7)",
      boardHint: "rgba(34, 197, 94, 0.4)",
      boardError: "rgba(255, 51, 0, 0.4)",
      cardGlow: "rgba(255, 0, 0, 0.1)",
    }
  },
  {
    id: "chess-com",
    name: "Chess.com",
    light: "#EEEED2",
    dark: "#769656",
    description: "Оригинальные цвета самой популярной шахматной платформы",
    icon: Globe,
    systemDesign: {
      accent: "#62b312ff",
      accentHover: "#97CC5E",
      accentMuted: "rgba(129, 182, 76, 0.15)",
      gold: "#C9A227",
      goldMuted: "rgba(201, 162, 39, 0.1)",
      gray950: "#ffffffff",
      gray900: "#1E1D19",
      gray850: "#272522",
      gray800: "#62b312ff",
      gray700: "#477e22ff",
      gray600: "#555250",
      gray400: "#aca8a1ff",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(224, 82, 82, 0.15)",
      warning: "#F59E0B",
      info: "#3B82F6",
      boardLight: "#EEEED2",
      boardDark: "#769656",
      boardHighlight: "rgba(246, 246, 105, 0.7)",
      boardHint: "rgba(129, 182, 76, 0.5)",
      boardError: "rgba(224, 82, 82, 0.5)",
      cardGlow: "rgba(128, 255, 0, 0.1)",
    }
  },
  {
    id: "blue",
    name: "Океан",
    light: "#B8D0E0",
    dark: "#4A7A9B",
    description: "Спокойные голубые и серые тона",
    icon: Waves,
    systemDesign: {
      accent: "#138ad4ff",
      accentHover: "#5CB2E8",
      accentMuted: "rgba(74, 158, 212, 0.15)",
      gold: "#7AA8C0",
      goldMuted: "rgba(122, 168, 192, 0.1)",
      gray950: "#ffffffff",
      gray900: "#0D1520",
      gray850: "#131E2C",
      gray800: "#138ad4ff",
      gray700: "#195383ff",
      gray600: "#354A60",
      gray400: "#90a4b8ff",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(224, 82, 82, 0.15)",
      warning: "#C9922A",
      info: "#4A9ED4",
      boardLight: "#B8D0E0",
      boardDark: "#4A7A9B",
      boardHighlight: "rgba(246, 246, 105, 0.65)",
      boardHint: "rgba(45, 201, 138, 0.45)",
      boardError: "rgba(224, 82, 82, 0.5)",
      cardGlow: "rgba(0, 157, 255, 0.1)",
    }
  },
  {
    id: "purple",
    name: "Аметист",
    light: "#D8C8F0",
    dark: "#7C5CBF",
    description: "Элегантная фиолетовая палитра",
    icon: Gem,
    systemDesign: {
      accent: "#9770daff",
      accentHover: "#AE8AF0",
      accentMuted: "rgba(155, 116, 224, 0.15)",
      gold: "#C0A0E8",
      goldMuted: "rgba(192, 160, 232, 0.1)",
      gray950: "#ffffffff",
      gray900: "#100D1C",
      gray850: "#171228",
      gray800: "#9770daff",
      gray700: "#574083ff",
      gray600: "#43386A",
      gray400: "#b8aeceff",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(244, 114, 182, 0.15)",
      warning: "#C9922A",
      info: "#9B74E0",
      boardLight: "#D8C8F0",
      boardDark: "#7C5CBF",
      boardHighlight: "rgba(246, 246, 105, 0.65)",
      boardHint: "rgba(74, 222, 128, 0.45)",
      boardError: "rgba(244, 114, 182, 0.5)",
      cardGlow: "rgba(165, 113, 255, 0.1)",
    }
  },
  {
    id: "classic-light",
    name: "Деневной",
    light: "#fdfdfdff",
    dark: "#b4b4b4ff",
    description: "Светлый вариант классической темы",
    icon: Sun,
    systemDesign: {
      accent: "#000000ff",
      accentHover: "#a04f00ff",
      accentMuted: "rgba(0, 0, 0, 0.12)",
      gold: "#A07020",
      goldMuted: "rgba(160, 112, 32, 0.1)",
      gray950: "#ffffff",
      gray900: "#ffffffff",
      gray850: "#ffffffff",
      gray800: "#9c9c9cff",
      gray700: "#9c9c9cff",
      gray600: "#a08060",
      gray400: "#222222ff",
      gray200: "#000000ff",
      gray50: "#000000ff",
      success: "#1a7a3a",
      successMuted: "rgba(26, 122, 58, 0.12)",
      error: "#cc2200ff",
      errorMuted: "rgba(204, 34, 0, 0.12)",
      warning: "#b06010",
      info: "#2060a0",
      boardLight: "#f0f0f0ff",
      boardDark: "#b4b4b4ff",
      boardHighlight: "rgba(200, 180, 0, 0.55)",
      boardHint: "rgba(40, 160, 60, 0.4)",
      boardError: "rgba(204, 34, 0, 0.4)",
      cardGlow: "transparent",
    }
  },
  {
    id: "dark",
    name: "Ночной",
    light: "#b4b4b4ff",
    dark: "#3d3d3dff",
    description: "Атмосферная тема для игры в ночное время",
    icon: Moon,
    systemDesign: {
      accent: "#ffffffff",
      accentHover: "#F0F0FF",
      accentMuted: "rgba(255, 255, 255, 0.35)",
      gold: "#A0A0B0",
      goldMuted: "rgba(160, 160, 176, 0.1)",
      gray950: "#000000ff",
      gray900: "#000000ff",
      gray850: "#000000ff",
      gray800: "#a3a3a3ff",
      gray700: "#ffffffff",
      gray600: "#3A3A40",
      gray400: "#b9b9b9ff",
      gray200: "#ffffffff",
      gray50: "#ffffffff",
      success: "#00ff5eff",
      successMuted: "rgba(74, 222, 128, 0.12)",
      error: "#ff0000ff",
      errorMuted: "rgba(248, 113, 113, 0.15)",
      warning: "#FBBF24",
      info: "#60A5FA",
      boardLight: "#f0f0f0ff",
      boardDark: "#707070ff",
      boardHighlight: "rgba(220, 220, 80, 0.55)",
      boardHint: "rgba(74, 222, 128, 0.45)",
      boardError: "rgba(248, 113, 113, 0.5)",
      cardGlow: "rgba(255, 255, 255, 0.25)",
    }
  }
]
