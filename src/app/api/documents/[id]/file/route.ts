import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFamily } from '@/lib/api'
import { readUpload } from '@/lib/uploads'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const family = await requireFamily()
  if (!family.ok) return family.response

  const { id } = await params
  const document = await prisma.document.findFirst({
    where: { id, workspaceId: family.workspaceId },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
    },
  })

  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const version = document.versions[0]
  if (!version) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  try {
    const bytes = await readUpload(version.filePath)
    const filename = version.fileName.replace(/["\r\n]/g, '')
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': version.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
