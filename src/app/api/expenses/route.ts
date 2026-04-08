import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await prisma.expenseEntry.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { category, amount, frequency, notes } = body

  if (!category || !amount) return NextResponse.json({ error: 'Category and amount required' }, { status: 400 })

  const expense = await prisma.expenseEntry.create({
    data: {
      workspaceId: session.user.workspaceId,
      category,
      amount: parseFloat(amount),
      frequency: frequency || 'monthly',
      notes,
      isActive: true,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
