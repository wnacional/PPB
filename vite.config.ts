import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "readable-dist",
    rollupOptions: { input: "readable.html" }
  }
});
