import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
  include: ['core/**/*.test.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
  },
})
