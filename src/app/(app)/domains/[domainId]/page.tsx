'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  User, Clock, CheckCircle, Circle, Plus, FileText,
  ExternalLink, RefreshCw, ChevronRight, AlertCircle
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DOMAINS, DOMAIN_STATUS_CONFIG, DOCUMENT_TYPES } from '@/lib/constants'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface DomainData {
  id: string
  domainKey: string
  status: string
  reviewCadence: string
  lastReviewedAt: string | null
  nextReviewDueAt: string | null
  owner: { id: string; name: string | null; email: string } | null
}

interface Task {
  id: string
  title: string
  status: string
  dueDate: string | null
  assignedTo: { name: string | null; email: string } | null
}

interface Decision {
  id: string
  description: string
  decisionDate: string
  participants: string | null
  rationale: string | null
}

interface Document {
  id: string
  displayName: string
  documentTypeKey: string
  isCritical: boolean
  createdAt: string
}

export default function DomainWorkspacePage() {
  const { domainId } = useParams<{ domainId: string }>()
  const [activeTab, setActiveTab] = useState('overview')
  const [domain, setDomain] = useState<DomainData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [newDecision, setNewDecision] = useState({ description: '', rationale: '', participants: '' })
  const [addingDecision, setAddingDecision] = useState(false)

  const domainDef = DOMAINS.find((d) => d.key === domainId)
  const requiredDocTypes = DOCUMENT_TYPES.filter((d) => d.domainKey === domainId)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [domainRes, tasksRes, decisionsRes, docsRes] = await Promise.all([
          fetch(`/api/domains/${domainId}`),
          fetch(`/api/tasks?domainKey=${domainId}`),
          fetch(`/api/decisions?domainKey=${domainId}`),
          fetch(`/api/documents?domainKey=${domainId}`),
        ])
        if (domainRes.ok) setDomain(await domainRes.json())
        if (tasksRes.ok) setTasks(await tasksRes.json())
        if (decisionsRes.ok) setDecisions(await decisionsRes.json())
        if (docsRes.ok) setDocuments(await docsRes.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [domainId])

  const handleMarkReviewed = async () => {
    setReviewLoading(true)
    const res = await fetch(`/api/domains/${domainId}/review`, { method: 'POST' })
    if (res.ok) {
      const updated = await fetch(`/api/domains/${domainId}`)
      if (updated.ok) setDomain(await updated.json())
    }
    setReviewLoading(false)
  }

  const handleAddTask = async () => {
    if (!newTask.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask, domainKey: domainId }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks([...tasks, task])
      setNewTask('')
      setAddingTask(false)
    }
  }

  const handleAddDecision = async () => {
    if (!newDecision.description.trim()) return
    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newDecision, domainKey: domainId }),
    })
    if (res.ok) {
      const decision = await res.json()
      setDecisions([decision, ...decisions])
      setNewDecision({ description: '', rationale: '', participants: '' })
      setAddingDecision(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'complete' }),
    })
    if (res.ok) setTasks(tasks.filter((t) => t.id !== taskId))
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) setTasks(tasks.filter((t) => t.id !== taskId))
  }

  if (!domainDef) return <div className="p-6 text-slate-500">Domain not found.</div>
  if (loading) return <div className="p-6 text-slate-500">Loading...</div>

  const status = domain?.status || 'not_started'
  const config = DOMAIN_STATUS_CONFIG[status as keyof typeof DOMAIN_STATUS_CONFIG]
  const isOverdue = domain?.nextReviewDueAt && new Date(domain.nextReviewDueAt) < new Date()
  const openTasks = tasks.filter((t) => t.status === 'open')

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: `Documents (${documents.length})` },
    { key: 'decisions', label: `Decisions (${decisions.length})` },
    { key: 'tasks', label: `Tasks (${openTasks.length})` },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/domains" className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
          ← All Domains
        </Link>
      </div>
      <PageHeader title={domainDef.label} description={domainDef.description}>
        <span className={cn('text-sm px-3 py-1 rounded-full font-medium', config.color)}>
          {config.label}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkReviewed}
          disabled={reviewLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', reviewLoading && 'animate-spin')} />
          Mark Reviewed
        </Button>
      </PageHeader>

      {/* Meta info */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 text-slate-400" />
          {domain?.owner ? (
            <span>{domain.owner.name || domain.owner.email}</span>
          ) : (
            <span className="text-amber-600">No owner — <Link href="/family" className="underline">assign in Family</Link></span>
          )}
        </div>
        {domain?.lastReviewedAt && (
          <div className="flex items-center gap-1.5">
            <Clock className={cn('h-4 w-4', isOverdue ? 'text-amber-500' : 'text-slate-400')} />
            <span className={cn(isOverdue ? 'text-amber-600' : '')}>
              {isOverdue ? 'Overdue — last reviewed ' : 'Last reviewed '}
              {formatDistanceToNow(new Date(domain.lastReviewedAt))} ago
            </span>
          </div>
        )}
        {!domain?.lastReviewedAt && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-4 w-4" />
            <span>Never reviewed</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">What this domain covers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">{domainDef.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Review cadence</p>
                  <p className="font-medium capitalize">{domain?.reviewCadence?.replace('_', '-') || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Next review due</p>
                  <p className={cn('font-medium', isOverdue ? 'text-amber-600' : '')}>
                    {domain?.nextReviewDueAt
                      ? format(new Date(domain.nextReviewDueAt), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required documents summary */}
          {requiredDocTypes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Required Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requiredDocTypes.map((docType) => {
                    const uploaded = documents.some((d) => d.documentTypeKey === docType.key)
                    return (
                      <div key={docType.key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {uploaded ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300" />
                          )}
                          <span className={uploaded ? 'text-slate-700' : 'text-slate-500'}>{docType.label}</span>
                          {docType.isCritical && !uploaded && (
                            <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Critical</span>
                          )}
                        </div>
                        {!uploaded && (
                          <Link href={`/documents?upload=true&type=${docType.key}&domain=${domainId}`}>
                            <Button size="sm" variant="ghost" className="text-indigo-600 h-7">
                              Upload <Plus className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/documents?upload=true&domain=${domainId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Upload Document
              </Button>
            </Link>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No documents for this domain yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload documents to keep this domain complete</p>
              <Link href={`/documents?upload=true&domain=${domainId}`}>
                <Button size="sm" className="mt-4">Upload first document</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50">
                  <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{doc.displayName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DOCUMENT_TYPES.find((t) => t.key === doc.documentTypeKey)?.label || doc.documentTypeKey}
                      {' · '}
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {doc.isCritical && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-medium">Critical</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {!addingDecision ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddingDecision(true)}>
                <Plus className="h-4 w-4 mr-2" /> Log Decision
              </Button>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Log a Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Decision *</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-20"
                    placeholder="What was decided?"
                    value={newDecision.description}
                    onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Rationale</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-16"
                    placeholder="Why was this decision made?"
                    value={newDecision.rationale}
                    onChange={(e) => setNewDecision({ ...newDecision, rationale: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Participants</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="Who was involved in this decision?"
                    value={newDecision.participants}
                    onChange={(e) => setNewDecision({ ...newDecision, participants: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddDecision} disabled={!newDecision.description.trim()}>
                    Save Decision
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingDecision(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {decisions.length === 0 && !addingDecision ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No decisions recorded yet</p>
              <p className="text-sm text-slate-400 mt-1">Record decisions as they happen so they don&apos;t need to be reconstructed later.</p>
              <Button size="sm" className="mt-4" onClick={() => setAddingDecision(true)}>Log first decision</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <Card key={decision.id}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-slate-900 mb-1">{decision.description}</p>
                    {decision.rationale && (
                      <p className="text-sm text-slate-600 mb-2">{decision.rationale}</p>
                    )}
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{format(new Date(decision.decisionDate), 'MMM d, yyyy')}</span>
                      {decision.participants && <span>• {decision.participants}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {!addingTask ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddingTask(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                placeholder="Describe the task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                autoFocus
              />
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.trim()}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingTask(false)}>Cancel</Button>
            </div>
          )}

          {openTasks.length === 0 && !addingTask ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-300" />
              <p className="text-slate-600 font-medium">No open tasks</p>
              <Button size="sm" className="mt-4" onClick={() => setAddingTask(true)}>Add a task</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-4 bg-white">
                  <button onClick={() => handleCompleteTask(task.id)}>
                    <Circle className="h-5 w-5 text-slate-300 hover:text-green-500 transition-colors" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{task.title}</p>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {task.assignedTo && <span>{task.assignedTo.name || task.assignedTo.email}</span>}
                      {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() ? 'text-red-500' : ''}>
                          Due {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
