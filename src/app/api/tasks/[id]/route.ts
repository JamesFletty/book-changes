import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, assignedToId, dueDate, title } = body

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(status ? { status, ...(status === 'complete' ? { completedAt: new Date() } : {}) } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(title ? { title } : {}),
    },
  })

  if (status === 'complete') {
    await prisma.timelineEvent.create({
      data: {
        workspaceId: session.user.workspaceId,
        eventType: 'task_complete',
        sourceEntityType: 'task',
        sourceEntityId: task.id,
        domainId: task.domainId,
        summary: `Completed task: ${task.title}`,
        eventDate: new Date(),
      },
    })
  }

  return NextResponse.json(task)
}
