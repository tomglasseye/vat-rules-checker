import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so tests don't start the React Router and Netlify plugins
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
