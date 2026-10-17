import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily, resolveDomain, withDomainKey } from '@/lib/api'

export async function GET(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')
  const status = url.searchParams.get('status') || 'open'

  const where: {
    workspaceId: string
    status: string
    domainId?: string
  } = {
    workspaceId: family.workspaceId,
    status,
  }

  if (domainKey) {
    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json([])
    where.domainId = domain.id
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { name: true, email: true } },
      domain: { select: { domainKey: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(tasks.map(withDomainKey))
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const domainKey = typeof body.domainKey === 'string' ? body.domainKey : ''
  const description = typeof body.description === 'string' ? body.description : null
  const dueDate = body.dueDate ? new Date(body.dueDate) : null

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
  }

  let domainId: string | null = null
  if (domainKey) {
    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 400 })
    domainId = domain.id
  }

  const task = await prisma.task.create({
    data: {
      workspaceId: family.workspaceId,
      title,
      description,
      domainId,
      dueDate,
      status: 'open',
      sourceType: 'manual',
    },
    include: {
      assignedTo: { select: { name: true, email: true } },
      domain: { select: { domainKey: true } },
    },
  })

  return NextResponse.json(withDomainKey(task), { status: 201 })
}
