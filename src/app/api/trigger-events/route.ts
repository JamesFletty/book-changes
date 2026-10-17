import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CASCADE_RULES } from '@/lib/cascade-rules'
import { TRIGGER_EVENT_TYPES, DOMAINS } from '@/lib/constants'
import { addDays } from 'date-fns'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const events = await prisma.triggerEvent.findMany({
    where: { workspaceId: family.workspaceId },
    include: { loggedBy: { select: { name: true, email: true } } },
    orderBy: { eventDate: 'desc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const eventTypeKey = typeof body.eventTypeKey === 'string' ? body.eventTypeKey : ''
  const description = typeof body.description === 'string' ? body.description : null

  if (!eventTypeKey) return NextResponse.json({ error: 'Event type required' }, { status: 400 })

  const eventDate = body.eventDate ? new Date(body.eventDate) : new Date()
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: 'Invalid event date' }, { status: 400 })
  }

  const eventTypeDef = TRIGGER_EVENT_TYPES.find((t) => t.key === eventTypeKey)
  const eventLabel = eventTypeDef?.label || eventTypeKey

  const event = await prisma.triggerEvent.create({
    data: {
      workspaceId: family.workspaceId,
      eventTypeKey,
      eventDate,
      description,
      loggedById: family.userId,
    },
  })

  await prisma.timelineEvent.create({
    data: {
      workspaceId: family.workspaceId,
      eventType: 'trigger_event',
      sourceEntityType: 'trigger_event',
      sourceEntityId: event.id,
      summary: `Event logged: ${eventLabel}${description ? ` — ${description}` : ''}`,
      eventDate,
    },
  })

  const rules = CASCADE_RULES[eventTypeKey] || []
  const cascadeTasks: { title: string; domain: string }[] = []

  for (const rule of rules) {
    const domain = await prisma.domain.findFirst({
      where: { workspaceId: family.workspaceId, domainKey: rule.domainKey },
    })

    await prisma.task.create({
      data: {
        workspaceId: family.workspaceId,
        title: `[${eventLabel}] ${rule.task}`,
        domainId: domain?.id ?? null,
        dueDate: addDays(eventDate, rule.daysToComplete),
        status: 'open',
        sourceType: 'trigger_event',
        sourceId: event.id,
      },
    })

    const domainDef = DOMAINS.find((d) => d.key === rule.domainKey)
    cascadeTasks.push({ title: rule.task, domain: domainDef?.label || rule.domainKey })
  }

  return NextResponse.json({ event, cascadeTasks }, { status: 201 })
}
