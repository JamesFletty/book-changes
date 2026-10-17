import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function verifyCredentials(email: unknown, password: unknown) {
  if (typeof email !== 'string' || typeof password !== 'string') return null

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) return null

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) return null

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    workspaceId: user.workspaceId,
  }
}
