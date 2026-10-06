import colors from "tailwindcss/colors.js";

/**
 * Builds a Tailwind color scale whose values read from the CSS custom
 * properties in src/styles/tokens.css, preserving opacity modifiers.
 */
function scale(name, steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
  return Object.fromEntries(
    steps.map((step) => [step, `rgb(var(--sv-${name}-${step}) / <alpha-value>)`]),
  );
}

const token = (name) => `rgb(var(--sv-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primitive palettes remapped to brand tokens. Existing `gray-*` and
        // `indigo-*` utilities across the codebase pick these up automatically.
        gray: scale("gray"),
        indigo: scale("violet"),
        violet: scale("violet"),
        green: colors.emerald,

        // Semantic, theme-aware tokens — prefer these in new code.
        canvas: token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          raised: token("surface-raised"),
          sunken: token("surface-sunken"),
          hover: token("hover"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        fg: {
          DEFAULT: token("fg"),
          muted: token("fg-muted"),
          subtle: token("fg-subtle"),
        },
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          fg: token("accent-fg"),
          text: token("accent-text"),
          soft: token("accent-soft"),
        },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
      },
      fontFamily: {
        sans: ["var(--sv-font-sans)"],
        display: ["var(--sv-font-display)"],
        mono: ["var(--sv-font-mono)"],
      },
      borderRadius: {
        sm: "var(--sv-radius-xs)",
        md: "var(--sv-radius-sm)",
        lg: "var(--sv-radius-sm)",
        xl: "var(--sv-radius-md)",
        "2xl": "var(--sv-radius-lg)",
        "3xl": "var(--sv-radius-xl)",
      },
      boxShadow: {
        sm: "var(--sv-shadow-sm)",
        DEFAULT: "var(--sv-shadow-md)",
        md: "var(--sv-shadow-md)",
        lg: "var(--sv-shadow-lg)",
        xl: "var(--sv-shadow-lg)",
        glow: "var(--sv-glow)",
      },
      ringColor: {
        DEFAULT: token("ring"),
      },
      transitionTimingFunction: {
        DEFAULT: "var(--sv-ease-out)",
        out: "var(--sv-ease-out)",
      },
      transitionDuration: {
        DEFAULT: "var(--sv-duration-base)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in var(--sv-duration-base) var(--sv-ease-out)",
        "slide-up": "slide-up var(--sv-duration-slow) var(--sv-ease-out)",
      },
    },
  },
  plugins: [],
};
