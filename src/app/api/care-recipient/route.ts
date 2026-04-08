import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const careRecipient = await prisma.careRecipient.findUnique({
    where: { workspaceId: session.user.workspaceId },
  })

  return NextResponse.json(careRecipient)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      fullLegalName, dateOfBirth, careSettingType, conditionContext, knownAllergies,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
    } = body

    if (!fullLegalName) {
      return NextResponse.json({ error: 'Full legal name is required' }, { status: 400 })
    }

    // Build emergency contacts JSON from onboarding fields
    let emergencyContacts = '[]'
    if (emergencyContactName) {
      emergencyContacts = JSON.stringify([{
        name: emergencyContactName,
        phone: emergencyContactPhone || '',
        relationship: emergencyContactRelationship || '',
      }])
    }

    const existing = await prisma.careRecipient.findUnique({
      where: { workspaceId: session.user.workspaceId },
    })

    if (existing) {
      const updated = await prisma.careRecipient.update({
        where: { workspaceId: session.user.workspaceId },
        data: { fullLegalName, dateOfBirth, careSettingType, conditionContext, knownAllergies, emergencyContacts },
      })
      return NextResponse.json(updated)
    }

    const careRecipient = await prisma.careRecipient.create({
      data: {
        workspaceId: session.user.workspaceId,
        fullLegalName,
        dateOfBirth,
        careSettingType: careSettingType || 'home',
        conditionContext,
        knownAllergies,
        emergencyContacts,
      },
    })

    return NextResponse.json(careRecipient, { status: 201 })
  } catch (error) {
    console.error('Care recipient error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updated = await prisma.careRecipient.update({
      where: { workspaceId: session.user.workspaceId },
      data: body,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Care recipient update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
