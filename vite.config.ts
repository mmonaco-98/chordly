import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import { fileURLToPath } from "url";

const pkg = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8")
);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server:
    process.env.VITE_USE_HTTPS === "true"
      ? {
          host: true,
          https: {
            key: fs.readFileSync("./certs/localhost+1-key.pem"),
            cert: fs.readFileSync("./certs/localhost+1.pem"),
          },
        }
      : {},
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "icons/*.svg"],
      manifest: {
        name: "Chordly",
        short_name: "Chordly",
        description: "Testi e accordi delle mie canzoni preferite",
        theme_color: "#18212b",
        background_color: "#18212b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
