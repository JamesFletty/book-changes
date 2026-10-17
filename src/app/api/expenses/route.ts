import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

function parseAmount(amount: unknown) {
  const parsed = typeof amount === 'number' ? amount : parseFloat(String(amount ?? ''))
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET() {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const expenses = await prisma.expenseEntry.findMany({
    where: { workspaceId: family.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const body = await req.json()
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const amount = parseAmount(body.amount)

  if (!category || amount === null) {
    return NextResponse.json({ error: 'Category and amount required' }, { status: 400 })
  }

  const expense = await prisma.expenseEntry.create({
    data: {
      workspaceId: family.workspaceId,
      category,
      amount,
      frequency: typeof body.frequency === 'string' && body.frequency ? body.frequency : 'monthly',
      notes: typeof body.notes === 'string' ? body.notes : null,
      isActive: true,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
