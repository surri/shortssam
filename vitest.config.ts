import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: { alias: { "@": path.join(process.cwd()) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
