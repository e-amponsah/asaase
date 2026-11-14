import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the build works on GitHub Pages under any repo name.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { maplibre: ["maplibre-gl"] } } },
  },
});
