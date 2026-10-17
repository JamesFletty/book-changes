import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily, resolveDomain, withDomainKey } from '@/lib/api'
import { saveUpload } from '@/lib/uploads'

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export async function GET(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')
  const critical = url.searchParams.get('critical') === 'true'
  const search = url.searchParams.get('search') || ''

  const where: {
    workspaceId: string
    domainId?: string
    isCritical?: boolean
    OR?: Array<Record<string, { contains: string }>>
  } = {
    workspaceId: family.workspaceId,
  }

  if (domainKey) {
    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json([])
    where.domainId = domain.id
  }
  if (critical) where.isCritical = true
  if (search) {
    where.OR = [
      { displayName: { contains: search } },
      { notes: { contains: search } },
      { physicalLocation: { contains: search } },
    ]
  }

  const documents = await prisma.document.findMany({
    where,
    include: { domain: { select: { domainKey: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documents.map(withDomainKey))
}

export async function POST(req: Request) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const displayName = String(formData.get('displayName') || '')
    const documentTypeKey = String(formData.get('documentTypeKey') || '')
    const domainKey = String(formData.get('domainKey') || '')
    const isCritical = formData.get('isCritical') === 'true'
    const physicalLocation = String(formData.get('physicalLocation') || '') || null
    const notes = String(formData.get('notes') || '') || null

    if (!(file instanceof File) || !documentTypeKey || !domainKey) {
      return NextResponse.json({ error: 'File, document type, and domain are required' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is larger than 15 MB' }, { status: 400 })
    }

    const domain = await resolveDomain(family.workspaceId, domainKey)
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const saved = await saveUpload(family.workspaceId, file.name, bytes)

    const document = await prisma.document.create({
      data: {
        workspaceId: family.workspaceId,
        domainId: domain.id,
        documentTypeKey,
        displayName: displayName || file.name,
        isCritical,
        physicalLocation,
        notes,
      },
    })

    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || null,
        filePath: saved.relativePath,
        versionNumber: 1,
      },
    })

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
      include: { domain: { select: { domainKey: true } } },
    })

    await prisma.timelineEvent.create({
      data: {
        workspaceId: family.workspaceId,
        eventType: 'document_upload',
        sourceEntityType: 'document',
        sourceEntityId: document.id,
        domainId: domain.id,
        summary: `Uploaded: ${updated.displayName}`,
        eventDate: new Date(),
      },
    })

    return NextResponse.json(withDomainKey(updated), { status: 201 })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
