import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, User, Clock, CheckSquare, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { DOMAINS, DOMAIN_STATUS_CONFIG } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export default async function DomainsPage() {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/onboarding')

  const [domains, taskCounts] = await Promise.all([
    prisma.domain.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: { owner: { select: { name: true, email: true } } },
    }),
    prisma.task.groupBy({
      by: ['domainId'],
      where: { workspaceId: session.user.workspaceId, status: 'open' },
      _count: { id: true },
    }),
  ])

  const taskCountMap = Object.fromEntries(taskCounts.map((t) => [t.domainId, t._count.id]))

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Domains"
        description="Eight operational areas that cover all caregiving work. Keep each domain current to stay ahead of issues."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOMAINS.map((domainDef) => {
          const domain = domains.find((d) => d.domainKey === domainDef.key)
          const status = domain?.status || 'not_started'
          const config = DOMAIN_STATUS_CONFIG[status as keyof typeof DOMAIN_STATUS_CONFIG]
          const openTasks = taskCountMap[domain?.id || ''] || 0
          const isOverdue = domain?.nextReviewDueAt && new Date(domain.nextReviewDueAt) < new Date()

          return (
            <Link key={domainDef.key} href={`/domains/${domainDef.key}`}>
              <Card className={cn(
                'h-full hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer',
                isOverdue && 'border-amber-200'
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{domainDef.label}</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.color)}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{domainDef.description}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {domain?.owner ? (
                            <span className="text-slate-600">{domain.owner.name || domain.owner.email}</span>
                          ) : (
                            <span className="text-amber-600 font-medium">No owner assigned</span>
                          )}
                        </div>

                        {domain?.lastReviewedAt && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className={cn('h-3.5 w-3.5', isOverdue ? 'text-amber-500' : 'text-slate-400')} />
                            <span className={cn(isOverdue ? 'text-amber-600' : 'text-slate-500')}>
                              {isOverdue ? 'Overdue · ' : 'Reviewed '}
                              {formatDistanceToNow(new Date(domain.lastReviewedAt))} ago
                            </span>
                          </div>
                        )}

                        {openTasks > 0 && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-indigo-600">{openTasks} open task{openTasks > 1 ? 's' : ''}</span>
                          </div>
                        )}

                        {status === 'not_started' && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-500">Not started</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
