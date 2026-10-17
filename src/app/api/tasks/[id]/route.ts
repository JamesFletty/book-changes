import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWorkspaceMember, requireFamily, withDomainKey } from '@/lib/api'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await prisma.task.findFirst({
    where: { id, workspaceId: family.workspaceId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { status, assignedToId, dueDate, title, description } = body
  const normalizedStatus = status === 'completed' ? 'complete' : status

  if (assignedToId) {
    const member = await isWorkspaceMember(family.workspaceId, assignedToId)
    if (!member) {
      return NextResponse.json({ error: 'Assignee must belong to this family' }, { status: 400 })
    }
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...(normalizedStatus ? {
        status: normalizedStatus,
        ...(normalizedStatus === 'complete' ? { completedAt: new Date() } : { completedAt: null }),
      } : {}),
      ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
    },
    include: {
      assignedTo: { select: { name: true, email: true } },
      domain: { select: { domainKey: true } },
    },
  })

  if (normalizedStatus === 'complete') {
    await prisma.timelineEvent.create({
      data: {
        workspaceId: family.workspaceId,
        eventType: 'task_complete',
        sourceEntityType: 'task',
        sourceEntityId: task.id,
        domainId: task.domainId,
        summary: `Completed task: ${task.title}`,
        eventDate: new Date(),
      },
    })
  }

  return NextResponse.json(withDomainKey(task))
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await prisma.task.findFirst({
    where: { id, workspaceId: family.workspaceId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.task.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
