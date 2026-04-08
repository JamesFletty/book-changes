import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, resolutionNotes } = body

  const issue = await prisma.unresolvedIssue.update({
    where: { id: params.id },
    data: { status, ...(resolutionNotes ? { resolutionNotes } : {}) },
  })

  return NextResponse.json(issue)
}
