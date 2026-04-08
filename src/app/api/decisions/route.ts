import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')

  const decisions = await prisma.decisionEntry.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      ...(domainKey ? { domainId: domainKey } : {}),
    },
    include: { recordedBy: { select: { name: true, email: true } } },
    orderBy: { decisionDate: 'desc' },
  })

  return NextResponse.json(decisions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, rationale, participants, domainKey, decisionDate } = body

  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const decision = await prisma.decisionEntry.create({
    data: {
      workspaceId: session.user.workspaceId,
      description,
      rationale,
      participants,
      domainId: domainKey || null,
      decisionDate: decisionDate ? new Date(decisionDate) : new Date(),
      recordedById: session.user.id,
    },
    include: { recordedBy: { select: { name: true, email: true } } },
  })

  await prisma.timelineEvent.create({
    data: {
      workspaceId: session.user.workspaceId,
      eventType: 'decision',
      sourceEntityType: 'decision',
      sourceEntityId: decision.id,
      domainId: domainKey || null,
      summary: `Decision recorded: ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}`,
      eventDate: new Date(decision.decisionDate),
    },
  })

  return NextResponse.json(decision, { status: 201 })
}
