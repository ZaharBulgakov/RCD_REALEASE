import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#F97316",
          hover: "#FB923C",
          muted: "rgba(249, 115, 22, 0.15)",
        },
        gold: {
          DEFAULT: "#C9922A",
          muted: "rgba(201, 146, 42, 0.1)",
        },
        gray: {
          50: "#F2EBE6",
          200: "#C9B3A8",
          400: "#8C6B5A",
          600: "#543D32",
          700: "#3D2B22",
          800: "#281C16",
          850: "#1D1410",
          900: "#140D0B",
          950: "#0C0806",
        },
        success: {
          DEFAULT: "#22C55E",
          muted: "#22C55E1A",
        },
        error: {
          DEFAULT: "#E8360A",
          muted: "#E8360A26",
        },
        warning: "#F59E0B",
        info: "#3B82F6",
        board: {
          light: "#E8C89A",
          dark: "#A0714A",
          highlight: "#F6F669B3",
          hint: "#22C55E66",
          error: "#E8360A66",
        },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Epilogue", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: "0.6875rem",
        sm: "0.8125rem",
        base: "0.9375rem",
        md: "1.0625rem",
        lg: "1.3125rem",
        xl: "1.6875rem",
        "2xl": "2.25rem",
        "3xl": "3.25rem",
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        black: "900",
      },
      lineHeight: {
        tight: "1.1",
        snug: "1.3",
        normal: "1.5",
        relaxed: "1.7",
      },
      spacing: {
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-5": "20px",
        "sp-6": "24px",
        "sp-8": "32px",
        "sp-10": "40px",
        "sp-12": "48px",
        "sp-16": "64px",
        "sp-24": "96px",
      },
      borderRadius: {
        "r-sm": "4px",
        "r-md": "8px",
        "r-lg": "12px",
        "r-xl": "16px",
        "r-2xl": "24px",
        "r-full": "9999px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },
    },
  },
}

export default config
