import path from 'path'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'

export function uploadsRoot() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'data', 'uploads')
}

export function assertInsideUploads(relativePath: string) {
  const root = uploadsRoot()
  const resolved = path.resolve(root, relativePath)
  const relative = path.relative(root, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid upload path')
  }
  return resolved
}

export async function saveUpload(workspaceId: string, originalName: string, bytes: Buffer) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 120) || 'file'
  const fileName = `${Date.now()}-${safeName}`
  const relativePath = path.posix.join(workspaceId, fileName)
  const absolute = assertInsideUploads(relativePath)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, bytes)
  return { relativePath, fileName }
}

export async function readUpload(relativePath: string) {
  return readFile(assertInsideUploads(relativePath))
}

export async function removeUpload(relativePath: string) {
  try {
    await unlink(assertInsideUploads(relativePath))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
