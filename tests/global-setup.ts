import { execSync } from 'node:child_process'
import path from 'node:path'

const databaseUrl = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`

export default function setup() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  })
}
