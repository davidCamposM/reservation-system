import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F7F4",
        ink: "#0B1220",
        brand: { DEFAULT: "#0F8B7A", deep: "#087163", soft: "#DFF9F1" },
        accent: { lime: "#D5F68C", soft: "#F0FAD9" },
        semantic: {
          success: "#167C66",
          "success-soft": "#E1F8F1",
          warning: "#B45C08",
          "warning-soft": "#FFF2DB",
          danger: "#C43D4E",
          "danger-soft": "#FFF0F2",
          muted: "#5D6A7E",
        },
      },
      boxShadow: {
        float: "0 22px 60px -32px rgba(11, 18, 32, .42)",
        card: "0 12px 32px -24px rgba(11, 18, 32, .28)",
      },
    },
  },
  plugins: [],
};

export default config;
