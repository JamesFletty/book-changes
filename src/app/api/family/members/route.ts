import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const members = await prisma.user.findMany({
    where: { workspaceId: family.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      domains: { select: { domainKey: true } },
    },
  })

  return NextResponse.json(members)
}
