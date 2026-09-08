import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Nothing to proxy and no base path to set: the app is static, it talks to the node's RPC
// cross-origin from the visitor's own browser, and it is published at the root of
// explorer.silvra.net by .github/workflows/pages.yml.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
  },
  build: {
    target: "es2021",
    outDir: "dist",
  },
});
