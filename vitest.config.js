import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}', 'functions/**/*.test.js'],
    setupFiles: ['src/test-setup.js'],
    testTimeout: 30000,
  },
})
