import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const incomes = await prisma.incomeOffset.findMany({
    where: { workspaceId: family.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(incomes)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const { sourceName, sourceType, monthlyAmount, notes } = body
  const amount = typeof monthlyAmount === 'number' ? monthlyAmount : parseFloat(monthlyAmount)

  if (!sourceName || !Number.isFinite(amount)) {
    return NextResponse.json({ error: 'Source name and amount required' }, { status: 400 })
  }

  const income = await prisma.incomeOffset.create({
    data: {
      workspaceId: family.workspaceId,
      sourceName,
      sourceType: sourceType || 'other',
      monthlyAmount: amount,
      notes,
    },
  })

  return NextResponse.json(income, { status: 201 })
}
