import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily, withDomainKey } from '@/lib/api'

export async function GET(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const url = new URL(req.url)
  const type = url.searchParams.get('type')

  const events = await prisma.timelineEvent.findMany({
    where: {
      workspaceId: family.workspaceId,
      ...(type ? { eventType: type } : {}),
    },
    include: { domain: { select: { domainKey: true } } },
    orderBy: { eventDate: 'desc' },
    take: 100,
  })

  return NextResponse.json(events.map(withDomainKey))
}
