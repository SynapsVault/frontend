import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_URL ?? "";

  // Generate catalog URL pattern for service worker caching
  // Matches API origin to ensure cache only works for configured backend
  let catalogUrlPattern: RegExp;
  try {
    if (apiBase) {
      const apiOrigin = new URL(apiBase).origin;
      catalogUrlPattern = new RegExp(
        `^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/resources`,
      );
    } else {
      catalogUrlPattern = /^\/resources/;
    }
  } catch {
    catalogUrlPattern = /^\/resources/;
  }

  return {
    // Build configuration
    build: {
      // Target modern browsers (ES2020+)
      target: "ES2020",
      // Warn if chunks exceed 800KB (gzipped)
      chunkSizeWarningLimit: 800,
      // Generate source maps for production debugging
      sourcemap: true,
      // Optimize for production
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true, // Remove console logs in production
        },
      },
    },

    // Vite plugins
    plugins: [
      // React with Fast Refresh
      react(),

      // Bundle analysis tool
      visualizer({
        filename: "stats.html",
        brotliSize: true,
        gzipSize: true,
      }),

      // Progressive Web App support
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg"],
        manifest: {
          name: "SynapsVault",
          short_name: "SynapsVault",
          description:
            "Payment-protected vault for digital resources on Stellar using HTTP 402 and x402.",
          theme_color: "#7c5cfc",
          background_color: "#0a0d14",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            // Cache catalog API responses
            {
              urlPattern: catalogUrlPattern,
              handler: "NetworkFirst",
              options: {
                cacheName: "synapsvault-catalog",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],

    // Development server configuration
    server: {
      port: 5173,
      strictPort: false, // Fall back to next available port
      // Proxy API requests to backend
      proxy: {
        "/resources": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});