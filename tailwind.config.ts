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
        background: "#fbf9f6",
        foreground: "#1b1c1a",
        // Design palette (terracotta primary on warm linen)
        primary: { DEFAULT: "#a83223", container: "#c94a38", hover: "#8f271a" },
        // Legacy alias kept so existing classes (terra-*) follow the new palette
        terra: {
          50: "#fff5f2", 100: "#ffe8e2", 200: "#ffdad4", 300: "#ffb4a8", 400: "#e0705f",
          500: "#c94a38", 600: "#a83223", 700: "#8a1c10", 800: "#6b1409", 900: "#410100",
        },
        linen: { DEFAULT: "#fbf9f6", low: "#f5f3f0", mid: "#efeeeb", high: "#eae8e5", line: "#e7e3dc" },
        amberink: { 50: "#fffbf2", 100: "#faefe5", 200: "#f5dfa8", 700: "#904d00", 800: "#6e3900" },
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
