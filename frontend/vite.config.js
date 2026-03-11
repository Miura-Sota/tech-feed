import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
  server: {
    port: 5173,
    proxy: {
      "/articles":  { target: "http://localhost:8000", changeOrigin: true },
      "/auth":      { target: "http://localhost:8000", changeOrigin: true },
      "/settings":  { target: "http://localhost:8000", changeOrigin: true },
      "/bookmarks": { target: "http://localhost:8000", changeOrigin: true },
      "/read-marks":{ target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
