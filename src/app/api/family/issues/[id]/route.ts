import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await prisma.unresolvedIssue.findFirst({
    where: { id, workspaceId: family.workspaceId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const status = typeof body.status === 'string' ? body.status : undefined
  const resolutionNotes = typeof body.resolutionNotes === 'string' ? body.resolutionNotes : undefined

  const issue = await prisma.unresolvedIssue.update({
    where: { id: existing.id },
    data: {
      ...(status ? { status } : {}),
      ...(resolutionNotes ? { resolutionNotes } : {}),
    },
    include: { raisedBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(issue)
}
