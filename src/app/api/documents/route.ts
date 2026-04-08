import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const domainKey = url.searchParams.get('domainKey')
  const critical = url.searchParams.get('critical') === 'true'
  const search = url.searchParams.get('search') || ''

  const documents = await prisma.document.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      ...(domainKey ? { domainId: domainKey } : {}),
      ...(critical ? { isCritical: true } : {}),
      ...(search ? {
        OR: [
          { displayName: { contains: search } },
          { notes: { contains: search } },
          { physicalLocation: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documents)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const displayName = formData.get('displayName') as string
    const documentTypeKey = formData.get('documentTypeKey') as string
    const domainKey = formData.get('domainKey') as string
    const isCritical = formData.get('isCritical') === 'true'
    const physicalLocation = formData.get('physicalLocation') as string || null
    const notes = formData.get('notes') as string || null

    if (!file || !documentTypeKey || !domainKey) {
      return NextResponse.json({ error: 'File, document type, and domain are required' }, { status: 400 })
    }

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', session.user.workspaceId)
    await mkdir(uploadsDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    const document = await prisma.document.create({
      data: {
        workspaceId: session.user.workspaceId,
        domainId: domainKey,
        documentTypeKey,
        displayName: displayName || file.name,
        isCritical,
        physicalLocation,
        notes,
      },
    })

    // Create a version record
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath: `/uploads/${session.user.workspaceId}/${fileName}`,
        versionNumber: 1,
      },
    })

    // Log timeline event
    await prisma.timelineEvent.create({
      data: {
        workspaceId: session.user.workspaceId,
        eventType: 'document_upload',
        sourceEntityType: 'document',
        sourceEntityId: document.id,
        domainId: domainKey,
        summary: `Uploaded: ${document.displayName}`,
        eventDate: new Date(),
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
