import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Pixel Shine Studio v3.0.0 - Real-ESRGAN Configuration
export default defineConfig(() => ({
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
