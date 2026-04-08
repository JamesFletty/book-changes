import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meetings = await prisma.familyMeeting.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { meetingDate: 'desc' },
  })

  return NextResponse.json(meetings)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { meetingDate, participants, agenda, notes } = body

  const meeting = await prisma.familyMeeting.create({
    data: {
      workspaceId: session.user.workspaceId,
      meetingDate: new Date(meetingDate),
      participants: participants || '',
      agenda,
      notes,
    },
  })

  await prisma.timelineEvent.create({
    data: {
      workspaceId: session.user.workspaceId,
      eventType: 'family_meeting',
      sourceEntityType: 'family_meeting',
      sourceEntityId: meeting.id,
      summary: `Family meeting recorded — ${new Date(meetingDate).toLocaleDateString()}`,
      eventDate: new Date(meetingDate),
    },
  })

  return NextResponse.json(meeting, { status: 201 })
}
