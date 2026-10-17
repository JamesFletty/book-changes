import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMonths } from 'date-fns'
import { requireFamily } from '@/lib/api'

function getNextReviewDate(cadence: string): Date {
  const now = new Date()
  switch (cadence) {
    case 'monthly': return addMonths(now, 1)
    case 'quarterly': return addMonths(now, 3)
    case 'semi_annual': return addMonths(now, 6)
    case 'annual': return addMonths(now, 12)
    default: return addMonths(now, 3)
  }
}

type RouteContext = { params: Promise<{ domainId: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { domainId } = await params
  const body = await req.json().catch(() => ({}))
  const notes = typeof body.notes === 'string' ? body.notes : null

  const domain = await prisma.domain.findFirst({
    where: {
      workspaceId: family.workspaceId,
      OR: [{ id: domainId }, { domainKey: domainId }],
    },
  })

  if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

  const now = new Date()
  const nextReview = getNextReviewDate(domain.reviewCadence || 'quarterly')

  const [updatedDomain] = await Promise.all([
    prisma.domain.update({
      where: { id: domain.id },
      data: {
        lastReviewedAt: now,
        nextReviewDueAt: nextReview,
        status: 'current',
      },
      include: { owner: { select: { name: true, email: true } } },
    }),
    prisma.reviewLog.create({
      data: {
        workspaceId: family.workspaceId,
        domainId: domain.id,
        reviewedById: family.userId,
        reviewedAt: now,
        notes,
      },
    }),
    prisma.timelineEvent.create({
      data: {
        workspaceId: family.workspaceId,
        eventType: 'review_complete',
        sourceEntityType: 'domain',
        sourceEntityId: domain.id,
        domainId: domain.id,
        summary: `Domain reviewed: ${domain.domainKey.replace(/_/g, ' ')}`,
        eventDate: now,
      },
    }),
  ])

  return NextResponse.json(updatedDomain)
}
