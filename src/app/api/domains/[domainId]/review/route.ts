import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMonths, addWeeks } from 'date-fns'

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

export async function POST(req: Request, { params }: { params: { domainId: string } }) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { notes } = body

  const domain = await prisma.domain.findFirst({
    where: { workspaceId: session.user.workspaceId, domainKey: params.domainId },
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
        workspaceId: session.user.workspaceId,
        domainId: domain.id,
        reviewedById: session.user.id,
        reviewedAt: now,
        notes,
      },
    }),
    prisma.timelineEvent.create({
      data: {
        workspaceId: session.user.workspaceId,
        eventType: 'review_complete',
        sourceEntityType: 'domain',
        sourceEntityId: domain.id,
        domainId: domain.domainKey,
        summary: `Domain reviewed: ${domain.domainKey.replace(/_/g, ' ')}`,
        eventDate: now,
      },
    }),
  ])

  return NextResponse.json(updatedDomain)
}
