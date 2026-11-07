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
        terra: {
          50: "#fbf3ee", 100: "#f6e3d6", 200: "#ecc5ab", 300: "#e0a27c", 400: "#d27d4f",
          500: "#c4622f", 600: "#b4532a", 700: "#954423", 800: "#7a3a22", 900: "#65321f",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
