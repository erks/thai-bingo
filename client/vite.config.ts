import { defineConfig } from "vite";

export default defineConfig({
  base: "/thai-bingo/",
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
