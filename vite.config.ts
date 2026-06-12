import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  define: {
    __AUDIT_ENABLED__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    environmentMatchGlobs: [["src/lib/editor/documentSync*.test.ts", "jsdom"]],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**", "**/_debug/**"],
    },
  },
}));
