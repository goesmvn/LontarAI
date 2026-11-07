import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Editorial Minimalism (DESIGN.md)
        background: "#faf8f5",
        foreground: "#18181b",
        primary: { DEFAULT: "#a83223", container: "#c94a38", hover: "#8f271a" },
        terra: {
          50: "#fff5f2", 100: "#ffe8e2", 200: "#ffdad4", 300: "#ffb4a8", 400: "#e0705f",
          500: "#c94a38", 600: "#a83223", 700: "#8a1c10", 800: "#6b1409", 900: "#410100",
        },
        // Ink + surfaces: stone is remapped to the design's warm neutrals
        stone: {
          50: "#faf8f5", 100: "#f3efea", 200: "#e7e2da", 300: "#d6cebe", 400: "#a1a1aa",
          500: "#71717a", 600: "#52525b", 700: "#3f3f46", 800: "#27272a", 900: "#18181b",
        },
        linen: { DEFAULT: "#faf8f5", low: "#f3efea", mid: "#efeae3", high: "#e7e2da", line: "#e7e2da" },
        // Accent / manuscript-verified gold
        amberink: { 50: "#fffbf2", 100: "#fef3c7", 200: "#fde68a", 700: "#b45309", 800: "#92400e" },
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
