import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily, resolveDomain, withDomainKey } from '@/lib/api'

export async function GET(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')

  const where: { workspaceId: string; domainId?: string } = {
    workspaceId: family.workspaceId,
  }

  if (domainKey) {
    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json([])
    where.domainId = domain.id
  }

  const decisions = await prisma.decisionEntry.findMany({
    where,
    include: {
      recordedBy: { select: { name: true, email: true } },
      domain: { select: { domainKey: true } },
    },
    orderBy: { decisionDate: 'desc' },
  })

  return NextResponse.json(decisions.map(withDomainKey))
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const rationale = typeof body.rationale === 'string' ? body.rationale : null
  const participants = typeof body.participants === 'string' ? body.participants : null
  const domainKey = typeof body.domainKey === 'string' ? body.domainKey : ''

  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  let domainId: string | null = null
  if (domainKey) {
    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 400 })
    domainId = domain.id
  }

  const decisionDate = body.decisionDate ? new Date(body.decisionDate) : new Date()
  if (Number.isNaN(decisionDate.getTime())) {
    return NextResponse.json({ error: 'Invalid decision date' }, { status: 400 })
  }

  const decision = await prisma.decisionEntry.create({
    data: {
      workspaceId: family.workspaceId,
      description,
      rationale,
      participants,
      domainId,
      decisionDate,
      recordedById: family.userId,
    },
    include: {
      recordedBy: { select: { name: true, email: true } },
      domain: { select: { domainKey: true } },
    },
  })

  await prisma.timelineEvent.create({
    data: {
      workspaceId: family.workspaceId,
      eventType: 'decision',
      sourceEntityType: 'decision',
      sourceEntityId: decision.id,
      domainId,
      summary: `Decision recorded: ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}`,
      eventDate: decision.decisionDate,
    },
  })

  return NextResponse.json(withDomainKey(decision), { status: 201 })
}
