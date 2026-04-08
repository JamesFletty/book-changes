import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domains = await prisma.domain.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          tasks: { where: { status: 'open' } },
          documents: true,
        },
      },
    },
    orderBy: { domainKey: 'asc' },
  })

  return NextResponse.json(domains)
}
