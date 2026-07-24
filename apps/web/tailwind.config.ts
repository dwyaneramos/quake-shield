import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
      },
      colors: {
        // Brand: jade (trust / protection / payout) — QuakeShield's primary color
        shield: {
          50: "#f1fbf7",
          100: "#dcf5ea",
          200: "#b3e8d2",
          300: "#7ed3b3",
          400: "#45b98d",
          500: "#1f9e73",
          600: "#15805c",
          700: "#12664a",
          800: "#12513c",
          900: "#114332",
          950: "#08251c",
        },
        // Brand: seismic amber (magnitude / alerts / energy)
        quake: {
          50: "#fff8ec",
          100: "#ffecc7",
          200: "#ffd68a",
          300: "#ffbb4d",
          400: "#fd9d24",
          500: "#f2810c",
          600: "#d1650a",
          700: "#ad4c0c",
          800: "#8c3d10",
          900: "#733310",
          950: "#3f1904",
        },
        // Neutral: ink (navy-tinted greys used instead of plain gray)
        ink: {
          50: "#f5f7fa",
          100: "#e9edf3",
          200: "#d1dae5",
          300: "#aab8cc",
          400: "#7c8fab",
          500: "#5b6d8c",
          600: "#465372",
          700: "#34405a",
          800: "#232c40",
          900: "#161d2c",
          950: "#0c111c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
