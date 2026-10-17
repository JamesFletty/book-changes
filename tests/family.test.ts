import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as register } from '@/app/api/auth/register/route'
import { GET as getWorkspace, POST as createWorkspace } from '@/app/api/workspace/route'
import { GET as getCareRecipient, POST as createCareRecipient, PUT as updateCareRecipient } from '@/app/api/care-recipient/route'
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route'
import { DELETE as deleteTask, PUT as updateTask } from '@/app/api/tasks/[id]/route'
import { GET as listExpenses, POST as createExpense } from '@/app/api/expenses/route'
import { DELETE as deleteExpense, PATCH as updateExpense } from '@/app/api/expenses/[id]/route'
import { GET as listDocuments, POST as createDocument } from '@/app/api/documents/route'
import { DELETE as deleteDocument, PATCH as updateDocument } from '@/app/api/documents/[id]/route'
import { GET as downloadDocument } from '@/app/api/documents/[id]/file/route'
import { PUT as updateIssue } from '@/app/api/family/issues/[id]/route'
import { POST as createIssue, GET as listIssues } from '@/app/api/family/issues/route'
import { GET as listMembers } from '@/app/api/family/members/route'
import { PUT as updateDomain } from '@/app/api/domains/[domainId]/route'
import { POST as logTrigger } from '@/app/api/trigger-events/route'
import { prisma } from '@/lib/prisma'
import { createFamily, resetDatabase } from './helpers'

const sessionState = vi.hoisted(() => ({ userId: null as string | null }))

vi.mock('@/lib/auth', () => ({
  auth: async () => {
    if (!sessionState.userId) return null
    return { user: { id: sessionState.userId } }
  },
}))

beforeEach(async () => {
  sessionState.userId = null
  await resetDatabase()
})

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('onboarding against sqlite', () => {
  it('signs up, creates one family workspace, and saves the care recipient', async () => {
    const signup = await register(jsonRequest('http://localhost/api/auth/register', 'POST', {
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      password: 'family-pass',
    }))
    const created = await signup.json()
    sessionState.userId = created.id

    const workspaceResponse = await createWorkspace(jsonRequest('http://localhost/api/workspace', 'POST', {
      name: "Mom's Care Team",
      situationType: 'seeing_changes',
    }))
    expect(workspaceResponse.status).toBe(201)
    const workspace = await workspaceResponse.json()

    const again = await createWorkspace(jsonRequest('http://localhost/api/workspace', 'POST', {
      name: "Mom's Care Team",
      situationType: 'managing_care',
    }))
    const sameWorkspace = await again.json()
    expect(sameWorkspace.id).toBe(workspace.id)
    expect(await prisma.domain.count({ where: { workspaceId: workspace.id } })).toBe(8)

    const careResponse = await createCareRecipient(jsonRequest('http://localhost/api/care-recipient', 'POST', {
      fullLegalName: 'Margaret Lee',
      dateOfBirth: '1942-04-03',
      careSettingType: 'home_alone',
      emergencyContactName: 'Jordan Lee',
      emergencyContactPhone: '555-0100',
      emergencyContactRelationship: 'child',
    }))
    expect(careResponse.status).toBe(201)

    const loaded = await getCareRecipient()
    const careRecipient = await loaded.json()
    expect(careRecipient.fullLegalName).toBe('Margaret Lee')
    expect(careRecipient.workspaceId).toBe(workspace.id)
    expect(JSON.parse(careRecipient.emergencyContacts)[0].name).toBe('Jordan Lee')

    const current = await getWorkspace()
    expect((await current.json()).situationType).toBe('managing_care')
  })
})

describe('task, expense, and document CRUD', () => {
  it('creates, reads, updates, and deletes records for the signed-in family', async () => {
    const family = await createFamily('owner@example.com', 'Owner')
    sessionState.userId = family.userId

    const taskResponse = await createTask(jsonRequest('http://localhost/api/tasks', 'POST', {
      title: 'Call the clinic',
      domainKey: 'healthcare',
      description: 'Confirm the Thursday appointment',
    }))
    expect(taskResponse.status).toBe(201)
    const task = await taskResponse.json()
    const healthcare = await prisma.domain.findFirst({
      where: { workspaceId: family.workspaceId, domainKey: 'healthcare' },
    })
    expect(task.domainId).toBe(healthcare?.id)
    expect(task.domainKey).toBe('healthcare')

    const listed = await listTasks(new Request('http://localhost/api/tasks?domainKey=healthcare'))
    expect(await listed.json()).toEqual([expect.objectContaining({ id: task.id, title: 'Call the clinic' })])

    const updated = await updateTask(
      jsonRequest(`http://localhost/api/tasks/${task.id}`, 'PUT', { title: 'Call the clinic today', status: 'complete' }),
      { params: Promise.resolve({ id: task.id }) },
    )
    expect(updated.status).toBe(200)
    expect((await updated.json()).status).toBe('complete')
    expect(await prisma.timelineEvent.count({
      where: { workspaceId: family.workspaceId, eventType: 'task_complete' },
    })).toBe(1)

    const removed = await deleteTask(new Request(`http://localhost/api/tasks/${task.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: task.id }),
    })
    expect(removed.status).toBe(200)
    expect(await prisma.task.count()).toBe(0)

    const expenseResponse = await createExpense(jsonRequest('http://localhost/api/expenses', 'POST', {
      category: 'Medication',
      amount: 42.5,
      frequency: 'monthly',
      notes: 'Pharmacy copay',
    }))
    expect(expenseResponse.status).toBe(201)
    const expense = await expenseResponse.json()

    const patched = await updateExpense(
      jsonRequest(`http://localhost/api/expenses/${expense.id}`, 'PATCH', { amount: 55, notes: 'Updated copay' }),
      { params: Promise.resolve({ id: expense.id }) },
    )
    expect((await patched.json()).amount).toBe(55)

    const expenses = await listExpenses()
    expect(await expenses.json()).toEqual([expect.objectContaining({ id: expense.id, amount: 55 })])

    expect((await deleteExpense(new Request(`http://localhost/api/expenses/${expense.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: expense.id }),
    })).status).toBe(200)

    const form = new FormData()
    form.set('file', new File(['power of attorney'], 'poa.pdf', { type: 'application/pdf' }))
    form.set('displayName', 'Financial POA')
    form.set('documentTypeKey', 'poa_financial')
    form.set('domainKey', 'legal_authority')
    form.set('isCritical', 'true')
    form.set('physicalLocation', 'Blue binder')
    form.set('notes', 'Signed in 2024')

    const uploaded = await createDocument(new Request('http://localhost/api/documents', { method: 'POST', body: form }))
    expect(uploaded.status).toBe(201)
    const document = await uploaded.json()
    expect(document.domainKey).toBe('legal_authority')
    expect(document.displayName).toBe('Financial POA')

    const documents = await listDocuments(new Request('http://localhost/api/documents?domainKey=legal_authority&critical=true'))
    expect((await documents.json()).map((item: { id: string }) => item.id)).toEqual([document.id])

    const renamed = await updateDocument(
      jsonRequest(`http://localhost/api/documents/${document.id}`, 'PATCH', { displayName: 'Financial POA (copy)' }),
      { params: Promise.resolve({ id: document.id }) },
    )
    expect((await renamed.json()).displayName).toBe('Financial POA (copy)')

    const file = await downloadDocument(new Request(`http://localhost/api/documents/${document.id}/file`), {
      params: Promise.resolve({ id: document.id }),
    })
    expect(file.status).toBe(200)
    expect(await file.text()).toBe('power of attorney')

    expect((await deleteDocument(new Request(`http://localhost/api/documents/${document.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: document.id }),
    })).status).toBe(200)
    expect(await prisma.document.count()).toBe(0)
  })

  it('stores trigger-event tasks against real domain rows', async () => {
    const family = await createFamily('events@example.com')
    sessionState.userId = family.userId

    const response = await logTrigger(jsonRequest('http://localhost/api/trigger-events', 'POST', {
      eventTypeKey: 'HOSPITALIZATION',
      eventDate: '2026-10-01',
      description: 'Overnight observation',
    }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.cascadeTasks.length).toBeGreaterThan(0)

    const tasks = await prisma.task.findMany({ where: { workspaceId: family.workspaceId } })
    expect(tasks.length).toBe(body.cascadeTasks.length)
    for (const task of tasks) {
      const domain = await prisma.domain.findFirst({ where: { id: task.domainId || '' } })
      expect(domain?.workspaceId).toBe(family.workspaceId)
    }
  })
})

describe('family data isolation', () => {
  it('does not return or modify another family\'s records', async () => {
    const familyA = await createFamily('a@example.com', 'Family A')
    const familyB = await createFamily('b@example.com', 'Family B')

    sessionState.userId = familyA.userId
    const task = await (await createTask(jsonRequest('http://localhost/api/tasks', 'POST', {
      title: 'Private task',
      domainKey: 'healthcare',
    }))).json()
    const expense = await (await createExpense(jsonRequest('http://localhost/api/expenses', 'POST', {
      category: 'Home care aide',
      amount: 100,
    }))).json()
    const issue = await (await createIssue(jsonRequest('http://localhost/api/family/issues', 'POST', {
      description: 'Need a weekend schedule',
    }))).json()

    const form = new FormData()
    form.set('file', new File(['secret'], 'secret.txt', { type: 'text/plain' }))
    form.set('displayName', 'Secret directive')
    form.set('documentTypeKey', 'living_will')
    form.set('domainKey', 'advance_directives')
    const document = await (await createDocument(new Request('http://localhost/api/documents', {
      method: 'POST',
      body: form,
    }))).json()

    sessionState.userId = familyB.userId

    expect(await (await listTasks(new Request('http://localhost/api/tasks'))).json()).toEqual([])
    expect(await (await listExpenses()).json()).toEqual([])
    expect(await (await listDocuments(new Request('http://localhost/api/documents'))).json()).toEqual([])
    expect(await (await listIssues()).json()).toEqual([])
    const members = await (await listMembers()).json()
    expect(members.map((member: { email: string }) => member.email)).toEqual(['b@example.com'])
    expect(JSON.stringify(members)).not.toContain('passwordHash')

    const params = { params: Promise.resolve({ id: task.id }) }
    expect((await updateTask(jsonRequest(`http://localhost/api/tasks/${task.id}`, 'PUT', { title: 'Stolen' }), params)).status).toBe(404)
    expect((await deleteTask(new Request(`http://localhost/api/tasks/${task.id}`, { method: 'DELETE' }), params)).status).toBe(404)
    expect((await updateExpense(jsonRequest(`http://localhost/api/expenses/${expense.id}`, 'PATCH', { amount: 1 }), {
      params: Promise.resolve({ id: expense.id }),
    })).status).toBe(404)
    expect((await deleteExpense(new Request(`http://localhost/api/expenses/${expense.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: expense.id }),
    })).status).toBe(404)
    expect((await updateDocument(jsonRequest(`http://localhost/api/documents/${document.id}`, 'PATCH', { displayName: 'Stolen' }), {
      params: Promise.resolve({ id: document.id }),
    })).status).toBe(404)
    expect((await downloadDocument(new Request(`http://localhost/api/documents/${document.id}/file`), {
      params: Promise.resolve({ id: document.id }),
    })).status).toBe(404)
    expect((await deleteDocument(new Request(`http://localhost/api/documents/${document.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: document.id }),
    })).status).toBe(404)
    expect((await updateIssue(jsonRequest(`http://localhost/api/family/issues/${issue.id}`, 'PUT', { status: 'resolved' }), {
      params: Promise.resolve({ id: issue.id }),
    })).status).toBe(404)

    const foreignDomain = await prisma.domain.findFirst({ where: { workspaceId: familyA.workspaceId, domainKey: 'healthcare' } })
    expect((await createTask(jsonRequest('http://localhost/api/tasks', 'POST', {
      title: 'Cross family',
      domainKey: foreignDomain?.id,
    }))).status).toBe(400)

    expect((await updateDomain(jsonRequest('http://localhost/api/domains/healthcare', 'PUT', { ownerId: familyA.userId }), {
      params: Promise.resolve({ domainId: 'healthcare' }),
    })).status).toBe(400)

    const moved = await updateCareRecipient(jsonRequest('http://localhost/api/care-recipient', 'PUT', {
      workspaceId: familyA.workspaceId,
      fullLegalName: 'Should stay here',
    }))
    expect(moved.status).toBe(404)

    await createCareRecipient(jsonRequest('http://localhost/api/care-recipient', 'POST', {
      fullLegalName: 'Family B Parent',
    }))
    const tampered = await updateCareRecipient(jsonRequest('http://localhost/api/care-recipient', 'PUT', {
      workspaceId: familyA.workspaceId,
      fullLegalName: 'Family B Parent',
    }))
    const careRecipient = await tampered.json()
    expect(careRecipient.workspaceId).toBe(familyB.workspaceId)

    expect(await prisma.task.findUnique({ where: { id: task.id } })).toMatchObject({ title: 'Private task' })
    expect(await prisma.expenseEntry.findUnique({ where: { id: expense.id } })).toMatchObject({ amount: 100 })
    expect(await prisma.document.findUnique({ where: { id: document.id } })).toMatchObject({ displayName: 'Secret directive' })
    expect(await prisma.unresolvedIssue.findUnique({ where: { id: issue.id } })).toMatchObject({ status: 'open' })
    expect(await prisma.timelineEvent.count({ where: { workspaceId: familyB.workspaceId, eventType: 'task_complete' } })).toBe(0)
  })

  it('rejects anonymous API access', async () => {
    expect((await listTasks(new Request('http://localhost/api/tasks'))).status).toBe(401)
    expect((await listExpenses()).status).toBe(401)
    expect((await listDocuments(new Request('http://localhost/api/documents'))).status).toBe(401)
    expect((await getWorkspace()).status).toBe(401)
  })
})
