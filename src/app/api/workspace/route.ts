import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DOMAINS } from '@/lib/constants'
import { requireUser } from '@/lib/api'

export async function GET() {
  const authResult = await requireUser()
  if (!authResult.ok) return authResult.response

  const user = await prisma.user.findUnique({
    where: { id: authResult.userId },
    select: {
      workspace: {
        include: {
          careRecipient: true,
        },
      },
    },
  })

  return NextResponse.json(user?.workspace || null)
}

export async function POST(req: Request) {
  const authResult = await requireUser()
  if (!authResult.ok) return authResult.response

  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const situationType = typeof body.situationType === 'string' ? body.situationType : 'organizing'

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { workspaceId: true },
    })

    if (user?.workspaceId) {
      const workspace = await prisma.workspace.update({
        where: { id: user.workspaceId },
        data: { name, situationType },
      })
      return NextResponse.json(workspace)
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        situationType,
        ownerId: authResult.userId,
      },
    })

    await prisma.domain.createMany({
      data: DOMAINS.map((d) => ({
        workspaceId: workspace.id,
        domainKey: d.key,
        status: 'not_started',
      })),
    })

    await prisma.user.update({
      where: { id: authResult.userId },
      data: { workspaceId: workspace.id },
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
