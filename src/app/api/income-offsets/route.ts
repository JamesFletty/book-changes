import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incomes = await prisma.incomeOffset.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(incomes)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sourceName, sourceType, monthlyAmount, notes } = body

  if (!sourceName || !monthlyAmount) return NextResponse.json({ error: 'Source name and amount required' }, { status: 400 })

  const income = await prisma.incomeOffset.create({
    data: {
      workspaceId: session.user.workspaceId,
      sourceName,
      sourceType: sourceType || 'other',
      monthlyAmount: parseFloat(monthlyAmount),
      notes,
    },
  })

  return NextResponse.json(income, { status: 201 })
}
