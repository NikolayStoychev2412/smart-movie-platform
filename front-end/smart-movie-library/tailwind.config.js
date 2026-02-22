/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "section-title": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "card-title": ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.5", fontWeight: "400" }],
        "micro": ["11px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      colors: {
        // === SEMANTIC TOKENS (CSS var-based, theme-aware) ===
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--text-muted)",

        // === MIDNIGHT VIOLET PALETTE ===

        // Primary — Violet
        primary: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          pressed: "#5B21B6",
          subtle: "#EDE9FE",
        },

        // Secondary — Teal
        secondary: {
          DEFAULT: "#14B8A6",
          hover: "#0D9488",
          pressed: "#0F766E",
          subtle: "#CCFBF1",
        },

        // Dark theme surfaces
        dark: {
          bg: "#0B0B12",
          surface: "#121226",
          "surface-2": "#1A1A33",
          border: "#2A2A4A",
          text: "#EDEDF7",
          muted: "#A7A7C7",
        },

        // Light theme surfaces
        light: {
          bg: "#FAFAFF",
          surface: "#FFFFFF",
          "surface-2": "#F3F4FF",
          border: "#E6E7F5",
          text: "#121225",
          muted: "#4B4B6A",
        },

        // Status colors
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
    },
  },
  plugins: [],
};
