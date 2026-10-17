import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily, resolveDomain, withDomainKey } from '@/lib/api'
import { removeUpload } from '@/lib/uploads'

type RouteContext = { params: Promise<{ id: string }> }

async function findOwnedDocument(id: string, workspaceId: string) {
  return prisma.document.findFirst({
    where: { id, workspaceId },
    include: {
      domain: { select: { domainKey: true } },
      versions: true,
    },
  })
}

export async function GET(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const document = await findOwnedDocument(id, family.workspaceId)
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(withDomainKey(document))
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await findOwnedDocument(id, family.workspaceId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: {
    displayName?: string
    notes?: string | null
    physicalLocation?: string | null
    isCritical?: boolean
    domainId?: string
  } = {}

  if (typeof body.displayName === 'string' && body.displayName.trim()) {
    data.displayName = body.displayName.trim()
  }
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null
  if (body.physicalLocation !== undefined) {
    data.physicalLocation = body.physicalLocation ? String(body.physicalLocation) : null
  }
  if (typeof body.isCritical === 'boolean') data.isCritical = body.isCritical
  if (typeof body.domainKey === 'string' && body.domainKey) {
    const domain = await resolveDomain(family.workspaceId, body.domainKey)
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 400 })
    data.domainId = domain.id
  }

  const document = await prisma.document.update({
    where: { id: existing.id },
    data,
    include: { domain: { select: { domainKey: true } } },
  })

  return NextResponse.json(withDomainKey(document))
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const existing = await findOwnedDocument(id, family.workspaceId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await Promise.all(existing.versions.map((version) => removeUpload(version.filePath)))
  await prisma.document.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
