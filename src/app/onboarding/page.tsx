'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ChevronRight, ChevronLeft, Check, AlertTriangle, TrendingDown, Activity, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SITUATIONS = [
  {
    key: 'organizing',
    icon: LayoutDashboard,
    label: 'Just getting organized',
    description: "Things are stable. I want to set this up before something happens.",
    actions: [
      'Upload a Power of Attorney or other legal document',
      'Complete the Legal Authority Status Tracker',
      'Assign yourself as domain owner for Legal and Medical',
    ],
  },
  {
    key: 'seeing_changes',
    icon: TrendingDown,
    label: 'Seeing early changes',
    description: "I'm noticing cognitive or physical decline and need to get ahead of it.",
    actions: [
      'Start the Cognitive & Functional Observation Log',
      'Complete the Capacity & Safety Snapshot',
      'Check that legal authority documents are in place',
    ],
  },
  {
    key: 'managing_care',
    icon: Activity,
    label: 'Managing active care',
    description: 'We are already coordinating care daily or weekly.',
    actions: [
      'Open Crisis Mode and complete the Emergency Packet checklist',
      'Upload insurance card and current medications list',
      'Add your care team contacts',
    ],
  },
  {
    key: 'crisis',
    icon: AlertTriangle,
    label: 'In or just past a crisis',
    description: 'We had a fall, hospitalization, or emergency and need to catch up.',
    actions: [
      'Open Crisis Mode and confirm your emergency packet',
      'Upload any documents from the recent event',
      'Log the event to generate a follow-up review list',
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [workspaceName, setWorkspaceName] = useState('')
  const [careRecipient, setCareRecipient] = useState({
    fullLegalName: '',
    dateOfBirth: '',
    careSettingType: 'home_alone',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  })
  const [situation, setSituation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedSituation = SITUATIONS.find((s) => s.key === situation)

  const handleCreateWorkspace = async () => {
    setLoading(true)
    setError('')
    try {
      // Create workspace
      const wsRes = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName, situationType: situation }),
      })
      if (!wsRes.ok) throw new Error('Failed to create workspace')
      const ws = await wsRes.json()

      // Create care recipient
      const crRes = await fetch('/api/care-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: ws.id,
          ...careRecipient,
        }),
      })
      if (!crRes.ok) throw new Error('Failed to save care recipient')

      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center mb-8">
          <Heart className="h-7 w-7 text-indigo-600 mr-2" />
          <span className="text-xl font-bold text-slate-900">Caregiver Command Center</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step > n
                    ? 'bg-indigo-600 text-white'
                    : step === n
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 4 && <div className={cn('w-12 h-0.5 mx-1', step > n ? 'bg-indigo-600' : 'bg-slate-200')} />}
            </div>
          ))}
        </div>

        {/* Step 1: Workspace */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Name your workspace</CardTitle>
              <CardDescription>
                This is your family&apos;s care coordination workspace. You can name it anything — most families use the care recipient&apos;s name.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Mom's Care Team or Johnson Family"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div className="rounded-md bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                <strong>Important:</strong> Caregiver Command Center helps you organize caregiving information. It does not provide legal, medical, or financial advice. Always consult a licensed professional for decisions that require professional judgment.
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!workspaceName.trim()}
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Care Recipient */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Add the care recipient</CardTitle>
              <CardDescription>
                Tell us about the person you are coordinating care for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Full legal name</Label>
                  <Input
                    placeholder="Full legal name"
                    value={careRecipient.fullLegalName}
                    onChange={(e) => setCareRecipient({ ...careRecipient, fullLegalName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input
                    type="date"
                    value={careRecipient.dateOfBirth}
                    onChange={(e) => setCareRecipient({ ...careRecipient, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current living situation</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={careRecipient.careSettingType}
                    onChange={(e) => setCareRecipient({ ...careRecipient, careSettingType: e.target.value })}
                  >
                    <option value="home_alone">Home — living alone</option>
                    <option value="home_with_support">Home — with in-home support</option>
                    <option value="family_home">Living with family</option>
                    <option value="assisted_living">Assisted living</option>
                    <option value="memory_care">Memory care</option>
                    <option value="skilled_nursing">Skilled nursing facility</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Primary emergency contact</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Name"
                    value={careRecipient.emergencyContactName}
                    onChange={(e) => setCareRecipient({ ...careRecipient, emergencyContactName: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={careRecipient.emergencyContactPhone}
                    onChange={(e) => setCareRecipient({ ...careRecipient, emergencyContactPhone: e.target.value })}
                  />
                  <Input
                    placeholder="Relationship"
                    value={careRecipient.emergencyContactRelationship}
                    onChange={(e) => setCareRecipient({ ...careRecipient, emergencyContactRelationship: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!careRecipient.fullLegalName.trim()}
                >
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Situation Selector */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Where is your family right now?</CardTitle>
              <CardDescription>
                This helps us show you the most important starting steps. You can change this anytime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SITUATIONS.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.key}
                    onClick={() => setSituation(s.key)}
                    className={cn(
                      'w-full text-left rounded-lg border-2 p-4 transition-all',
                      situation === s.key
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn('h-5 w-5 mt-0.5', situation === s.key ? 'text-indigo-600' : 'text-slate-400')} />
                      <div>
                        <p className={cn('font-medium', situation === s.key ? 'text-indigo-900' : 'text-slate-900')}>
                          {s.label}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">{s.description}</p>
                      </div>
                      {situation === s.key && (
                        <Check className="h-4 w-4 text-indigo-600 ml-auto mt-0.5 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)} disabled={!situation}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: First Actions */}
        {step === 4 && selectedSituation && (
          <Card>
            <CardHeader>
              <CardTitle>Here&apos;s where to start</CardTitle>
              <CardDescription>
                Based on your situation, these are the three most important first steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {selectedSituation.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm text-indigo-900">{action}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                These are suggestions. You can work through any domain in any order from your dashboard.
              </p>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handleCreateWorkspace} disabled={loading}>
                  {loading ? 'Setting up your workspace...' : 'Go to my dashboard'}
                  {!loading && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
