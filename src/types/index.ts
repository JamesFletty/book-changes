import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      workspaceId?: string | null
    } & DefaultSession['user']
  }

  interface User {
    workspaceId?: string | null
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    workspaceId?: string | null
  }
}

export type DomainStatus = 'not_started' | 'in_progress' | 'needs_review' | 'current'
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type SituationType = 'organizing' | 'seeing_changes' | 'managing_care' | 'crisis'

export interface DomainConfig {
  key: string
  label: string
  description: string
  icon: string
  color: string
}

export interface DocumentTypeConfig {
  key: string
  label: string
  domainKey: string | null
  isCritical: boolean
}

export interface WorkspaceWithDetails {
  id: string
  name: string
  situationType: string
  ownerId: string
  careRecipient?: {
    id: string
    fullLegalName: string
    dateOfBirth?: string | null
    careSettingType: string
    conditionContext?: string | null
    knownAllergies?: string | null
  } | null
}

export interface DomainWithDetails {
  id: string
  workspaceId: string
  domainKey: string
  ownerId?: string | null
  status: string
  reviewCadence: string
  lastReviewedAt?: Date | null
  nextReviewDueAt?: Date | null
  owner?: {
    id: string
    name?: string | null
    email: string
  } | null
  _count?: {
    tasks: number
    documents: number
  }
}

export interface TaskWithDetails {
  id: string
  workspaceId: string
  domainId?: string | null
  title: string
  assignedToId?: string | null
  dueDate?: Date | null
  status: string
  sourceType: string
  createdAt: Date
  domain?: {
    domainKey: string
  } | null
  assignedTo?: {
    id: string
    name?: string | null
    email: string
  } | null
}

export interface DocumentWithDetails {
  id: string
  workspaceId: string
  domainId?: string | null
  documentTypeKey: string
  displayName: string
  isCritical: boolean
  physicalLocation?: string | null
  notes?: string | null
  currentVersionId?: string | null
  createdAt: Date
  domain?: {
    domainKey: string
  } | null
  versions?: {
    id: string
    fileName: string
    fileSize?: number | null
    fileType?: string | null
    versionNumber: number
    filePath: string
    createdAt: Date
  }[]
}

export interface TimelineEventRecord {
  id: string
  workspaceId: string
  eventType: string
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  domainId?: string | null
  summary: string
  eventDate: Date
  domain?: {
    domainKey: string
  } | null
}
