import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/diocese-map-react/",
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  }
});
