'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, X, CheckCircle, Circle, AlertCircle, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DOMAINS } from '@/lib/constants'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  name: string | null
  email: string
  role: string
  domains: { domainKey: string }[]
}

interface Issue {
  id: string
  description: string
  category: string | null
  status: string
  createdAt: string
  raisedBy: { name: string | null; email: string } | null
}

interface Meeting {
  id: string
  meetingDate: string
  participants: string
  agenda: string | null
  notes: string | null
  createdAt: string
}

export default function FamilyPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('roles')

  const [newIssue, setNewIssue] = useState({ description: '', category: '' })
  const [addingIssue, setAddingIssue] = useState(false)

  const [meetingForm, setMeetingForm] = useState({
    meetingDate: new Date().toISOString().split('T')[0],
    participants: '',
    agenda: '',
    notes: '',
  })
  const [addingMeeting, setAddingMeeting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [membersRes, issuesRes, meetingsRes] = await Promise.all([
        fetch('/api/family/members'),
        fetch('/api/family/issues'),
        fetch('/api/family/meetings'),
      ])
      if (membersRes.ok) setMembers(await membersRes.json())
      if (issuesRes.ok) setIssues(await issuesRes.json())
      if (meetingsRes.ok) setMeetings(await meetingsRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const handleAddIssue = async () => {
    if (!newIssue.description.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/family/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIssue),
    })
    if (res.ok) {
      const issue = await res.json()
      setIssues([issue, ...issues])
      setNewIssue({ description: '', category: '' })
      setAddingIssue(false)
    }
    setSubmitting(false)
  }

  const handleResolveIssue = async (id: string) => {
    await fetch(`/api/family/issues/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    setIssues(issues.map((i) => (i.id === id ? { ...i, status: 'resolved' } : i)))
  }

  const handleAddMeeting = async () => {
    if (!meetingForm.meetingDate) return
    setSubmitting(true)
    const res = await fetch('/api/family/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingForm),
    })
    if (res.ok) {
      const meeting = await res.json()
      setMeetings([meeting, ...meetings])
      setMeetingForm({ meetingDate: new Date().toISOString().split('T')[0], participants: '', agenda: '', notes: '' })
      setAddingMeeting(false)
    }
    setSubmitting(false)
  }

  const tabs = [
    { key: 'roles', label: 'Roles & Owners' },
    { key: 'issues', label: `Issues (${issues.filter((i) => i.status === 'open').length} open)` },
    { key: 'meetings', label: `Meetings (${meetings.length})` },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Family"
        description="Role assignments, unresolved issues, and family meeting records."
      />

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

      {/* Roles & Owners Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workspace Members</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-400">Loading...</p>
              ) : members.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500">No members yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                        {(member.name || member.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{member.name || member.email}</p>
                        {member.name && <p className="text-xs text-slate-500">{member.email}</p>}
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded capitalize">{member.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Domain Ownership</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DOMAINS.map((domain) => {
                  const owner = members.find((m) => m.domains?.some((d) => d.domainKey === domain.key))
                  return (
                    <div key={domain.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <p className="text-sm text-slate-700">{domain.label}</p>
                      {owner ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-sm text-slate-600">{owner.name || owner.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> No owner
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Assign domain owners from within each domain workspace.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {!addingIssue ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddingIssue(true)}>
                <Plus className="h-4 w-4 mr-2" /> Log Issue
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium text-slate-900">Log an Unresolved Issue</h3>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Issue description *</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-20"
                    placeholder="Describe the issue..."
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={newIssue.category}
                    onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    <option value="legal">Legal</option>
                    <option value="medical">Medical</option>
                    <option value="financial">Financial</option>
                    <option value="family">Family dynamics</option>
                    <option value="care">Care coordination</option>
                    <option value="housing">Housing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddIssue} disabled={!newIssue.description.trim() || submitting}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingIssue(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {issues.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-300" />
              <p className="text-slate-600 font-medium">No unresolved issues</p>
              <p className="text-sm text-slate-400 mt-1">Log issues that need family discussion or resolution.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Card key={issue.id} className={issue.status === 'resolved' ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {issue.status === 'resolved' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">{issue.description}</p>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                          {issue.category && <span className="capitalize">{issue.category}</span>}
                          <span>{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                          {issue.raisedBy && <span>Raised by {issue.raisedBy.name || issue.raisedBy.email}</span>}
                        </div>
                      </div>
                      {issue.status === 'open' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleResolveIssue(issue.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {!addingMeeting ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddingMeeting(true)}>
                <Plus className="h-4 w-4 mr-2" /> Record Meeting
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium text-slate-900">Record a Family Meeting</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Date *</label>
                    <Input type="date" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Participants</label>
                    <Input placeholder="Who attended?" value={meetingForm.participants} onChange={(e) => setMeetingForm({ ...meetingForm, participants: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Agenda / Topics</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-16"
                    placeholder="What was discussed?"
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Notes & Decisions</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none h-20"
                    placeholder="Key notes and any decisions made..."
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddMeeting} disabled={submitting}>Save Meeting</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingMeeting(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {meetings.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No meeting records yet</p>
              <p className="text-sm text-slate-400 mt-1">Record family meetings to maintain a shared decision trail.</p>
              <Button size="sm" className="mt-4" onClick={() => setAddingMeeting(true)}>Record first meeting</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {format(new Date(meeting.meetingDate), 'MMMM d, yyyy')}
                        </p>
                        {meeting.participants && (
                          <p className="text-xs text-slate-500 mt-0.5">Attendees: {meeting.participants}</p>
                        )}
                      </div>
                    </div>
                    {meeting.agenda && <p className="text-sm text-slate-600 mt-2">{meeting.agenda}</p>}
                    {meeting.notes && <p className="text-sm text-slate-700 mt-1 border-t border-slate-100 pt-2">{meeting.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
