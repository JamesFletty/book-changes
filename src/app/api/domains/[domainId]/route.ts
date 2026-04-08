import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { domainId: string } }
) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Support lookup by both UUID and domainKey
  const domain = await prisma.domain.findFirst({
    where: {
      workspaceId: session.user.workspaceId,
      OR: [{ id: params.domainId }, { domainKey: params.domainId }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  })

  if (!domain) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(domain)
}

export async function PUT(
  req: Request,
  { params }: { params: { domainId: string } }
) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { ownerId, status, reviewCadence } = body

    await prisma.domain.updateMany({
      where: {
        workspaceId: session.user.workspaceId,
        OR: [{ id: params.domainId }, { domainKey: params.domainId }],
      },
      data: {
        ...(ownerId !== undefined && { ownerId }),
        ...(status !== undefined && { status }),
        ...(reviewCadence !== undefined && { reviewCadence }),
      },
    })

    const updated = await prisma.domain.findFirst({
      where: {
        workspaceId: session.user.workspaceId,
        OR: [{ id: params.domainId }, { domainKey: params.domainId }],
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Domain update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
