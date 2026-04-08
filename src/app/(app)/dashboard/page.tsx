import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle,
  Circle,
  Plus,
  ArrowRight,
  Upload,
  Zap,
  MessageSquare,
  Shield,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DOMAINS, DOMAIN_STATUS_CONFIG } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'

async function getDashboardData(workspaceId: string) {
  const [
    workspace,
    domains,
    tasks,
    documents,
    careRecipient,
    timelineEvents,
    triggerEvents,
  ] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, situationType: true } }),
    prisma.domain.findMany({
      where: { workspaceId },
      include: { owner: { select: { name: true, email: true } } },
    }),
    prisma.task.findMany({
      where: { workspaceId, status: 'open' },
      include: { assignedTo: { select: { name: true, email: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    }),
    prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.careRecipient.findUnique({ where: { workspaceId } }),
    prisma.timelineEvent.findMany({
      where: { workspaceId },
      orderBy: { eventDate: 'desc' },
      take: 5,
    }),
    prisma.triggerEvent.findMany({
      where: { workspaceId },
      orderBy: { eventDate: 'desc' },
      take: 3,
    }),
  ])

  const criticalDocTypes = ['poa_financial', 'poa_healthcare', 'living_will', 'dnr', 'insurance_card', 'medicare_card', 'medication_list']
  const uploadedDocTypes = new Set(documents.map((d) => d.documentTypeKey))
  const missingCritical = criticalDocTypes.filter((t) => !uploadedDocTypes.has(t))

  const now = new Date()
  const overdueReviews = domains.filter(
    (d) => d.nextReviewDueAt && new Date(d.nextReviewDueAt) < now
  )

  return { workspace, domains, tasks, documents, careRecipient, timelineEvents, triggerEvents, missingCritical, overdueReviews }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/onboarding')

  const {
    workspace,
    domains,
    tasks,
    documents,
    careRecipient,
    timelineEvents,
    missingCritical,
    overdueReviews,
  } = await getDashboardData(session.user.workspaceId)

  const emergencyPacketItems = [
    { key: 'name', label: 'Care recipient name', done: !!careRecipient?.fullLegalName },
    { key: 'contacts', label: 'Emergency contacts', done: !!careRecipient?.emergencyContacts },
    { key: 'poa_financial', label: 'POA (Financial) uploaded', done: documents.some((d) => d.documentTypeKey === 'poa_financial') },
    { key: 'poa_healthcare', label: 'POA (Healthcare) uploaded', done: documents.some((d) => d.documentTypeKey === 'poa_healthcare') },
    { key: 'directives', label: 'Advance directive uploaded', done: documents.some((d) => d.documentTypeKey === 'living_will') },
    { key: 'insurance', label: 'Insurance card uploaded', done: documents.some((d) => d.documentTypeKey === 'insurance_card') },
    { key: 'medications', label: 'Medication list uploaded', done: documents.some((d) => d.documentTypeKey === 'medication_list') },
  ]
  const packetComplete = emergencyPacketItems.filter((i) => i.done).length
  const packetTotal = emergencyPacketItems.length

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={`Command Center`}
        description={careRecipient ? `Coordinating care for ${careRecipient.fullLegalName}` : 'Your care coordination dashboard'}
      >
        <Link href="/documents?upload=true">
          <Button size="sm"><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
        </Link>
        <Link href="/timeline?log=event">
          <Button size="sm" variant="outline"><Zap className="h-4 w-4 mr-2" /> Log Event</Button>
        </Link>
      </PageHeader>

      {/* Alert banners */}
      <div className="space-y-3 mb-6">
        {missingCritical.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  {missingCritical.length} critical document{missingCritical.length > 1 ? 's' : ''} missing
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  These documents are needed for emergency situations and care decisions.
                </p>
              </div>
            </div>
            <Link href="/documents">
              <Button size="sm" variant="destructive">Upload now <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        )}
        {overdueReviews.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {overdueReviews.length} domain review{overdueReviews.length > 1 ? 's' : ''} overdue
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {overdueReviews.map((d) => DOMAINS.find((dd) => dd.key === d.domainKey)?.label).join(', ')}
                </p>
              </div>
            </div>
            <Link href="/domains">
              <Button size="sm" variant="outline" className="border-amber-300">Review now <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        )}
        {packetComplete < packetTotal && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Emergency packet: {packetComplete}/{packetTotal} items complete
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Complete your packet before you need it.</p>
              </div>
            </div>
            <Link href="/crisis">
              <Button size="sm" variant="outline">Complete packet <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: tasks + activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Open Tasks</CardTitle>
                <Link href="/domains" className="text-xs text-indigo-600 hover:underline">View all domains</Link>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No open tasks. You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const domain = DOMAINS.find((d) => d.key === task.domainId)
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
                    return (
                      <div key={task.id} className="flex items-start gap-3 py-3">
                        <Circle className="h-4 w-4 text-slate-300 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {domain && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {domain.label}
                              </span>
                            )}
                            {task.assignedTo && (
                              <span className="text-xs text-slate-500">{task.assignedTo.name || task.assignedTo.email}</span>
                            )}
                            {task.dueDate && (
                              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                {isOverdue ? 'Overdue: ' : 'Due: '}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain health grid */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Domain Status</CardTitle>
                <Link href="/domains" className="text-xs text-indigo-600 hover:underline">Open domains hub</Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {DOMAINS.map((domainDef) => {
                  const domain = domains.find((d) => d.domainKey === domainDef.key)
                  const status = domain?.status || 'not_started'
                  const config = DOMAIN_STATUS_CONFIG[status as keyof typeof DOMAIN_STATUS_CONFIG]
                  return (
                    <Link key={domainDef.key} href={`/domains/${domainDef.key}`}>
                      <div className="rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 leading-tight">{domainDef.label}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {domain?.owner
                            ? `Owner: ${domain.owner.name || domain.owner.email}`
                            : <span className="text-amber-600">No owner assigned</span>}
                        </p>
                        {domain?.lastReviewedAt && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Reviewed {formatDistanceToNow(new Date(domain.lastReviewedAt))} ago
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/documents?upload=true" className="block">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Upload className="h-4 w-4 mr-2 text-indigo-600" /> Upload a document
                </Button>
              </Link>
              <Link href="/timeline?log=event" className="block">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Zap className="h-4 w-4 mr-2 text-amber-600" /> Log a trigger event
                </Button>
              </Link>
              <Link href="/timeline?log=decision" className="block">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2 text-blue-600" /> Record a decision
                </Button>
              </Link>
              <Link href="/crisis" className="block">
                <Button variant="outline" className="w-full justify-start text-red-700 border-red-200 hover:bg-red-50" size="sm">
                  <Shield className="h-4 w-4 mr-2" /> Open crisis mode
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent documents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Documents</CardTitle>
                <Link href="/documents" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-500">No documents yet</p>
                  <Link href="/documents?upload=true">
                    <Button size="sm" variant="ghost" className="mt-2 text-indigo-600">
                      <Plus className="h-3 w-3 mr-1" /> Upload first document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-slate-700">{doc.displayName}</span>
                      {doc.isCritical && (
                        <span className="text-xs text-red-600 bg-red-50 px-1.5 rounded flex-shrink-0">Critical</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Link href="/timeline" className="text-xs text-indigo-600 hover:underline">Full timeline</Link>
              </div>
            </CardHeader>
            <CardContent>
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="text-sm">
                      <p className="text-slate-700 leading-snug">{event.summary}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(event.eventDate))} ago
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
