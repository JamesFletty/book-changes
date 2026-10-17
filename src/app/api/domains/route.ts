import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const domains = await prisma.domain.findMany({
    where: { workspaceId: family.workspaceId },
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
