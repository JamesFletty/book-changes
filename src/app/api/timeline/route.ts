import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type')

  const events = await prisma.timelineEvent.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      ...(type ? { eventType: type } : {}),
    },
    orderBy: { eventDate: 'desc' },
    take: 100,
  })

  return NextResponse.json(events)
}
