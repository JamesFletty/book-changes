import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DOMAINS } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, situationType } = body

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        situationType: situationType || 'organizing',
        ownerId: session.user.id,
        members: {
          connect: { id: session.user.id },
        },
      },
    })

    // Seed the 8 domains
    await prisma.domain.createMany({
      data: DOMAINS.map((d) => ({
        workspaceId: workspace.id,
        domainKey: d.key,
        status: 'not_started',
      })),
    })

    // Update the user's workspaceId
    await prisma.user.update({
      where: { id: session.user.id },
      data: { workspaceId: workspace.id },
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
