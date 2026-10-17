import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const meetings = await prisma.familyMeeting.findMany({
    where: { workspaceId: family.workspaceId },
    orderBy: { meetingDate: 'desc' },
  })

  return NextResponse.json(meetings)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const { meetingDate, participants, agenda, notes } = body

  if (!meetingDate) return NextResponse.json({ error: 'Meeting date required' }, { status: 400 })
  const parsedDate = new Date(meetingDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid meeting date' }, { status: 400 })
  }

  const meeting = await prisma.familyMeeting.create({
    data: {
      workspaceId: family.workspaceId,
      meetingDate: parsedDate,
      participants: participants || '',
      agenda,
      notes,
    },
  })

  await prisma.timelineEvent.create({
    data: {
      workspaceId: family.workspaceId,
      eventType: 'family_meeting',
      sourceEntityType: 'family_meeting',
      sourceEntityId: meeting.id,
      summary: `Family meeting recorded — ${new Date(meetingDate).toLocaleDateString()}`,
      eventDate: new Date(meetingDate),
    },
  })

  return NextResponse.json(meeting, { status: 201 })
}
