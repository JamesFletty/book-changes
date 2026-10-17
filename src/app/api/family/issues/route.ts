import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const issues = await prisma.unresolvedIssue.findMany({
    where: { workspaceId: family.workspaceId },
    include: { raisedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(issues)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const { description, category } = body

  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const issue = await prisma.unresolvedIssue.create({
    data: {
      workspaceId: family.workspaceId,
      description,
      category,
      status: 'open',
      raisedById: family.userId,
    },
    include: { raisedBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(issue, { status: 201 })
}
