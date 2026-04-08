import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.user.findMany({
    where: { workspaceId: session.user.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      domains: { select: { domainKey: true } },
    },
  })

  return NextResponse.json(members)
}
