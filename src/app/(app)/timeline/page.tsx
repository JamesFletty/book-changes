'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Clock, Zap, FileText, CheckCircle, MessageSquare, Plus, X
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DOMAINS, TRIGGER_EVENT_TYPES } from '@/lib/constants'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: string
  eventType: string
  summary: string
  eventDate: string
  domainId: string | null
  sourceEntityType: string | null
}

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  document_upload: { icon: FileText, color: 'text-blue-500 bg-blue-50', label: 'Document uploaded' },
  review_complete: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'Review completed' },
  trigger_event: { icon: Zap, color: 'text-amber-500 bg-amber-50', label: 'Event logged' },
  decision: { icon: MessageSquare, color: 'text-purple-500 bg-purple-50', label: 'Decision recorded' },
  task_complete: { icon: CheckCircle, color: 'text-slate-400 bg-slate-50', label: 'Task completed' },
  default: { icon: Clock, color: 'text-slate-400 bg-slate-50', label: 'Activity' },
}

export default function TimelinePage() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [showLogEvent, setShowLogEvent] = useState(searchParams.get('log') === 'event')
  const [showLogDecision, setShowLogDecision] = useState(searchParams.get('log') === 'decision')

  const [eventForm, setEventForm] = useState({
    eventTypeKey: '',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [decisionForm, setDecisionForm] = useState({
    description: '',
    rationale: '',
    participants: '',
    domainKey: '',
    decisionDate: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)
  const [cascadeTasks, setCascadeTasks] = useState<{ title: string; domain: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    const res = await fetch(`/api/timeline?${params}`)
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [filterType])

  useEffect(() => { load() }, [load])

  const handleLogEvent = async () => {
    if (!eventForm.eventTypeKey) return
    setSubmitting(true)
    const res = await fetch('/api/trigger-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventForm),
    })
    if (res.ok) {
      const data = await res.json()
      setCascadeTasks(data.cascadeTasks || [])
      setShowLogEvent(false)
      setEventForm({ eventTypeKey: '', eventDate: new Date().toISOString().split('T')[0], description: '' })
      load()
    }
    setSubmitting(false)
  }

  const handleLogDecision = async () => {
    if (!decisionForm.description.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionForm),
    })
    if (res.ok) {
      setShowLogDecision(false)
      setDecisionForm({ description: '', rationale: '', participants: '', domainKey: '', decisionDate: new Date().toISOString().split('T')[0] })
      load()
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Timeline"
        description="Every significant event, decision, document, and review in one chronological view."
      >
        <Button size="sm" variant="outline" onClick={() => setShowLogDecision(true)}>
          <MessageSquare className="h-4 w-4 mr-2" /> Log Decision
        </Button>
        <Button size="sm" onClick={() => setShowLogEvent(true)}>
          <Zap className="h-4 w-4 mr-2" /> Log Event
        </Button>
      </PageHeader>

      {/* Cascade task confirmation */}
      {cascadeTasks.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-amber-900 mb-2">
                  {cascadeTasks.length} follow-up task{cascadeTasks.length > 1 ? 's' : ''} created
                </p>
                <ul className="space-y-1">
                  {cascadeTasks.map((t, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-amber-600" />
                      {t.title}
                      <span className="text-xs text-amber-600">({t.domain})</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setCascadeTasks([])} className="text-amber-600 hover:text-amber-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Event form */}
      {showLogEvent && (
        <Card className="mb-6 border-indigo-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Log a Trigger Event</h3>
              <button onClick={() => setShowLogEvent(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Event type *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={eventForm.eventTypeKey}
                  onChange={(e) => setEventForm({ ...eventForm, eventTypeKey: e.target.value })}
                >
                  <option value="">Select event type</option>
                  {TRIGGER_EVENT_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date *</label>
                <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea
                  className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-20"
                  placeholder="Brief description of what happened..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>
              <p className="text-xs text-slate-400">Logging this event will generate follow-up review tasks for connected domains.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleLogEvent} disabled={!eventForm.eventTypeKey || submitting}>
                  {submitting ? 'Logging...' : 'Log Event & Generate Tasks'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowLogEvent(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Decision form */}
      {showLogDecision && (
        <Card className="mb-6 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Record a Decision</h3>
              <button onClick={() => setShowLogDecision(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Decision *</label>
                <textarea
                  className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-20"
                  placeholder="What was decided?"
                  value={decisionForm.description}
                  onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Date</label>
                  <Input type="date" value={decisionForm.decisionDate} onChange={(e) => setDecisionForm({ ...decisionForm, decisionDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Domain</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={decisionForm.domainKey}
                    onChange={(e) => setDecisionForm({ ...decisionForm, domainKey: e.target.value })}
                  >
                    <option value="">No specific domain</option>
                    {DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rationale</label>
                <Input placeholder="Why was this decided?" value={decisionForm.rationale} onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Participants</label>
                <Input placeholder="Who was involved?" value={decisionForm.participants} onChange={(e) => setDecisionForm({ ...decisionForm, participants: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleLogDecision} disabled={!decisionForm.description.trim() || submitting}>
                  {submitting ? 'Saving...' : 'Record Decision'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowLogDecision(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['', 'trigger_event', 'decision', 'document_upload', 'review_complete'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full font-medium transition-colors',
              filterType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {type === '' ? 'All' : EVENT_TYPE_CONFIG[type]?.label || type}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading timeline...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-medium text-slate-700 mb-1">No timeline events yet</h3>
          <p className="text-sm text-slate-400 mb-4">
            As you upload documents, log events, and record decisions, they&apos;ll all appear here.
          </p>
          <Button size="sm" onClick={() => setShowLogEvent(true)}>
            <Plus className="h-4 w-4 mr-2" /> Log first event
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4">
            {events.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.default
              const Icon = config.icon
              const domain = DOMAINS.find((d) => d.key === event.domainId)
              return (
                <div key={event.id} className="flex gap-4 relative">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10', config.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-900">{event.summary}</p>
                        {domain && (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            {domain.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(event.eventDate), 'MMMM d, yyyy')}
                        {' · '}
                        {formatDistanceToNow(new Date(event.eventDate))} ago
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
