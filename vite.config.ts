import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// Production builds are served from the GitHub Pages project subpath
// (/euphoric/); dev runs from the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/euphoric/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
}));
