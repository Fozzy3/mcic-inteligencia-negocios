import { defineConfig } from "vite";

// Relative base: the build works at any path (GitHub Pages serves it under /<repo>/).
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 1200 },
});
