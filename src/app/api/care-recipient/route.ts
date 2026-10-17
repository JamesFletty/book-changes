import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

const CARE_RECIPIENT_FIELDS = [
  'fullLegalName',
  'dateOfBirth',
  'careSettingType',
  'conditionContext',
  'knownAllergies',
  'emergencyContacts',
  'primaryPhysicianName',
  'primaryPhysicianPhone',
] as const

function pickCareRecipientFields(body: Record<string, unknown>) {
  const data: Record<string, string | null> = {}
  for (const field of CARE_RECIPIENT_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field]
      data[field] = value === null || value === '' ? null : String(value)
    }
  }
  return data
}

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const careRecipient = await prisma.careRecipient.findUnique({
    where: { workspaceId: family.workspaceId },
  })

  return NextResponse.json(careRecipient)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  try {
    const body = await req.json()
    const fullLegalName = typeof body.fullLegalName === 'string' ? body.fullLegalName.trim() : ''
    if (!fullLegalName) {
      return NextResponse.json({ error: 'Full legal name is required' }, { status: 400 })
    }

    let emergencyContacts = '[]'
    if (typeof body.emergencyContactName === 'string' && body.emergencyContactName.trim()) {
      emergencyContacts = JSON.stringify([{
        name: body.emergencyContactName.trim(),
        phone: typeof body.emergencyContactPhone === 'string' ? body.emergencyContactPhone : '',
        relationship: typeof body.emergencyContactRelationship === 'string' ? body.emergencyContactRelationship : '',
      }])
    } else if (typeof body.emergencyContacts === 'string') {
      emergencyContacts = body.emergencyContacts
    }

    const data = {
      fullLegalName,
      dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth) : null,
      careSettingType: body.careSettingType ? String(body.careSettingType) : 'home',
      conditionContext: body.conditionContext ? String(body.conditionContext) : null,
      knownAllergies: body.knownAllergies ? String(body.knownAllergies) : null,
      emergencyContacts,
    }

    const existing = await prisma.careRecipient.findUnique({
      where: { workspaceId: family.workspaceId },
    })

    if (existing) {
      const updated = await prisma.careRecipient.update({
        where: { workspaceId: family.workspaceId },
        data,
      })
      return NextResponse.json(updated)
    }

    const careRecipient = await prisma.careRecipient.create({
      data: {
        workspaceId: family.workspaceId,
        ...data,
      },
    })

    return NextResponse.json(careRecipient, { status: 201 })
  } catch (error) {
    console.error('Care recipient error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  try {
    const body = await req.json()
    const data = pickCareRecipientFields(body)
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const existing = await prisma.careRecipient.findUnique({
      where: { workspaceId: family.workspaceId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.careRecipient.update({
      where: { workspaceId: family.workspaceId },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Care recipient update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
