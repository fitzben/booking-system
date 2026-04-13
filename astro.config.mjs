import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

const isDeploying = process.env.IS_DEPLOYING === "true";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: isDeploying
    ? {
        // DEPLOY (npm run build):
        // Array-form alias with regex ensures our entry is first.
        // The adapter later appends its own string alias but first-match wins,
        // so react-dom/server → server.edge (no MessageChannel).
        resolve: {
          alias: [
            { find: /^react-dom\/server$/, replacement: "react-dom/server.edge" },
          ],
        },
      }
    : {
        // DEV (npm run dev):
        // Externalize react-dom so Node.js CJS loader handles it natively.
        // No "require is not defined" because Node.js CJS context has require.
        ssr: {
          external: ["react-dom"],
        },
      },
});
