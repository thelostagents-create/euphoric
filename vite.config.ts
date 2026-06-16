import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// Served from the root of the custom domain (euphoric.chat) in both prod and
// dev, so assets resolve at "/".
export default defineConfig(() => ({
  base: "/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
}));
