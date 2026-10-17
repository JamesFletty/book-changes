import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'

type RouteContext = { params: Promise<{ id: string }> }

function parseAmount(amount: unknown) {
  const parsed = typeof amount === 'number' ? amount : parseFloat(String(amount ?? ''))
  return Number.isFinite(parsed) ? parsed : null
}

async function findOwnedExpense(id: string, workspaceId: string) {
  return prisma.expenseEntry.findFirst({
    where: { id, workspaceId },
  })
}

export async function GET(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const expense = await findOwnedExpense(id, family.workspaceId)
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(expense)
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await findOwnedExpense(id, family.workspaceId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: {
    category?: string
    amount?: number
    frequency?: string
    notes?: string | null
    isActive?: boolean
  } = {}

  if (typeof body.category === 'string' && body.category.trim()) data.category = body.category.trim()
  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount)
    if (amount === null) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    data.amount = amount
  }
  if (typeof body.frequency === 'string' && body.frequency) data.frequency = body.frequency
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive

  const expense = await prisma.expenseEntry.update({
    where: { id: existing.id },
    data,
  })

  return NextResponse.json(expense)
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await findOwnedExpense(id, family.workspaceId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.expenseEntry.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
