import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Local dev: proxy /api/* to `vercel dev` (port 3000) so serverless funcs work.
  server: { proxy: { "/api": "http://localhost:3000" } },
});
