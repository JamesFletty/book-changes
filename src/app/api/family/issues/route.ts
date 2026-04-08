import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const issues = await prisma.unresolvedIssue.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: { raisedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(issues)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, category } = body

  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const issue = await prisma.unresolvedIssue.create({
    data: {
      workspaceId: session.user.workspaceId,
      description,
      category,
      status: 'open',
      raisedById: session.user.id,
    },
    include: { raisedBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(issue, { status: 201 })
}
