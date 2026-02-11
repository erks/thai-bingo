import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  root: ".",
  publicDir: "public",
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || "dev"),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 800,
  },
});
