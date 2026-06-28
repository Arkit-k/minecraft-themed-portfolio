import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#EEE5D1",
        charcoal: "#222222",
        graphite: "#3A3A38",
        gray: {
          soft: "#6E6E6E",
        },
        hairline: "rgba(34, 34, 34, 0.12)",
      },
      fontFamily: {
        serif: ["var(--font-instrument)", "Georgia", "serif"],
        instrument: ["var(--font-instrument-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      maxWidth: {
        // a centered single-column reading width (trending al-folio style)
        editorial: "44rem",
      },
    },
  },
  plugins: [],
};

export default config;
