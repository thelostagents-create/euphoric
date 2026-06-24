import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the built web app (in `dist`) into a native iOS/Android
// shell. Build the web app first (`npm run build`), then `npx cap sync`.
const config: CapacitorConfig = {
  appId: "chat.euphoric.app",
  appName: "Youphoric",
  webDir: "dist",
  server: {
    // Allow the in-app webview to use https origins (Supabase, Patreon, etc).
    androidScheme: "https",
  },
};

export default config;
