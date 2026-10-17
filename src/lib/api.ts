import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type FamilyContext = {
  ok: true
  userId: string
  workspaceId: string
  role: string
}

export type AuthFailure = {
  ok: false
  response: NextResponse
}

export async function requireUser(): Promise<{ ok: true; userId: string } | AuthFailure> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true, userId: user.id }
}

export async function requireFamily(): Promise<FamilyContext | AuthFailure> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, workspaceId: true, role: true },
  })

  if (!user?.workspaceId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return {
    ok: true,
    userId: user.id,
    workspaceId: user.workspaceId,
    role: user.role,
  }
}

export async function resolveDomain(workspaceId: string, domainKeyOrId: string) {
  return prisma.domain.findFirst({
    where: {
      workspaceId,
      OR: [{ id: domainKeyOrId }, { domainKey: domainKeyOrId }],
    },
    select: { id: true, domainKey: true },
  })
}

export async function isWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.user.findFirst({
    where: { id: userId, workspaceId },
    select: { id: true },
  })
  return Boolean(member)
}

export function withDomainKey<T extends { domain?: { domainKey: string } | null }>(row: T) {
  return {
    ...row,
    domainKey: row.domain?.domainKey ?? null,
  }
}
