import path from 'node:path'
import { defineConfig } from 'vitest/config'

const databaseUrl = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`
const uploadDir = path.join(process.cwd(), 'data', 'test-uploads')

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: './tests/global-setup.ts',
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: 'test-auth-secret-test-auth-secret-32',
      AUTH_TRUST_HOST: 'true',
      UPLOAD_DIR: uploadDir,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
