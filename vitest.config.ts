import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), VitePWA({ registerType: "prompt", injectRegister: false })],
  test: {
    environment: "jsdom",
    maxWorkers: 2,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
