import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'functions/**/*.test.js'],
    testTimeout: 30000,
  },
})
