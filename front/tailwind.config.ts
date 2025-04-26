import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        aeonik: ["Aeonik-"],
        "radio-grotesk": ["Radio Grotesk"],
      },
      colors: {
        brand: {
          DEFAULT: "#7C2CBF",
        },
        "brand-subtle": {
          DEFAULT: "#F4E7FF",
        },
        outline: {
          DEFAULT: "#E5E5E5",
        },
        ash: {
          DEFAULT: "#F6F6F5",
        },
        "ash-strong": {
          DEFAULT: "#F0F0F0",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
