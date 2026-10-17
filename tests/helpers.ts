import { rm } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { DOMAINS } from '@/lib/constants'

export async function resetDatabase() {
  await prisma.timelineEvent.deleteMany()
  await prisma.reviewLog.deleteMany()
  await prisma.documentVersion.deleteMany()
  await prisma.document.deleteMany()
  await prisma.task.deleteMany()
  await prisma.decisionEntry.deleteMany()
  await prisma.triggerEvent.deleteMany()
  await prisma.expenseEntry.deleteMany()
  await prisma.incomeOffset.deleteMany()
  await prisma.familyMeeting.deleteMany()
  await prisma.unresolvedIssue.deleteMany()
  await prisma.structuredRecord.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.careRecipient.deleteMany()
  await prisma.domain.deleteMany()
  await prisma.user.updateMany({ data: { workspaceId: null } })
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  if (process.env.UPLOAD_DIR) {
    await rm(process.env.UPLOAD_DIR, { recursive: true, force: true })
  }
}

export async function createFamily(email: string, name = 'Family Member') {
  const passwordHash = await bcrypt.hash('password123', 4)
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: 'owner' },
  })
  const workspace = await prisma.workspace.create({
    data: {
      name: `${name} workspace`,
      situationType: 'organizing',
      ownerId: user.id,
    },
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { workspaceId: workspace.id },
  })
  await prisma.domain.createMany({
    data: DOMAINS.map((domain) => ({
      workspaceId: workspace.id,
      domainKey: domain.key,
      status: 'not_started',
    })),
  })

  return { userId: user.id, workspaceId: workspace.id, email }
}
