import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')
  const status = url.searchParams.get('status') || 'open'

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      status,
      ...(domainKey ? { domainId: domainKey } : {}),
    },
    include: { assignedTo: { select: { name: true, email: true } } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, domainKey, dueDate, description } = body

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      workspaceId: session.user.workspaceId,
      title,
      description,
      domainId: domainKey || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'open',
      sourceType: 'manual',
    },
    include: { assignedTo: { select: { name: true, email: true } } },
  })

  return NextResponse.json(task, { status: 201 })
}
