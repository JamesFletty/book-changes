import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CASCADE_RULES } from '@/lib/cascade-rules'
import { TRIGGER_EVENT_TYPES, DOMAINS } from '@/lib/constants'
import { addDays } from 'date-fns'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await prisma.triggerEvent.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: { loggedBy: { select: { name: true, email: true } } },
    orderBy: { eventDate: 'desc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { eventTypeKey, eventDate, description } = body

  if (!eventTypeKey) return NextResponse.json({ error: 'Event type required' }, { status: 400 })

  const eventTypeDef = TRIGGER_EVENT_TYPES.find((t) => t.key === eventTypeKey)
  const eventLabel = eventTypeDef?.label || eventTypeKey

  const event = await prisma.triggerEvent.create({
    data: {
      workspaceId: session.user.workspaceId,
      eventTypeKey,
      eventDate: eventDate ? new Date(eventDate) : new Date(),
      description,
      loggedById: session.user.id,
    },
  })

  // Log to timeline
  await prisma.timelineEvent.create({
    data: {
      workspaceId: session.user.workspaceId,
      eventType: 'trigger_event',
      sourceEntityType: 'trigger_event',
      sourceEntityId: event.id,
      summary: `Event logged: ${eventLabel}${description ? ` — ${description}` : ''}`,
      eventDate: new Date(event.eventDate),
    },
  })

  // Generate cascade tasks
  const rules = CASCADE_RULES[eventTypeKey] || []
  const cascadeTasks: { title: string; domain: string }[] = []

  for (const rule of rules) {
    // Find the domain record for this workspace
    const domain = await prisma.domain.findFirst({
      where: { workspaceId: session.user.workspaceId, domainKey: rule.domainKey },
    })

    const taskTitle = `[${eventLabel}] ${rule.task}`
    const dueDate = addDays(new Date(event.eventDate), rule.daysToComplete)

    await prisma.task.create({
      data: {
        workspaceId: session.user.workspaceId,
        title: taskTitle,
        domainId: rule.domainKey,
        dueDate,
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
