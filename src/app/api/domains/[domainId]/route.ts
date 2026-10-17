import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWorkspaceMember, requireFamily } from '@/lib/api'

type RouteContext = { params: Promise<{ domainId: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { domainId } = await params
  const domain = await prisma.domain.findFirst({
    where: {
      workspaceId: family.workspaceId,
      OR: [{ id: domainId }, { domainKey: domainId }],
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

export async function PUT(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  try {
    const { domainId } = await params
    const body = await req.json()
    const { ownerId, status, reviewCadence } = body

    if (ownerId) {
      const member = await isWorkspaceMember(family.workspaceId, ownerId)
      if (!member) {
        return NextResponse.json({ error: 'Owner must belong to this family' }, { status: 400 })
      }
    }

    const existing = await prisma.domain.findFirst({
      where: {
        workspaceId: family.workspaceId,
        OR: [{ id: domainId }, { domainKey: domainId }],
      },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.domain.update({
      where: { id: existing.id },
      data: {
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(status !== undefined && { status }),
        ...(reviewCadence !== undefined && { reviewCadence }),
      },
    })

    const updated = await prisma.domain.findFirst({
      where: { id: existing.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Domain update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
