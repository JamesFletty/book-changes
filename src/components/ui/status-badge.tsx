import { cn } from '@/lib/utils'
import { DOMAIN_STATUS_CONFIG } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = DOMAIN_STATUS_CONFIG[status as keyof typeof DOMAIN_STATUS_CONFIG] || {
    label: status,
    color: 'bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface DocStatusBadgeProps {
  uploaded: boolean
  isCritical?: boolean
  className?: string
}

export function DocStatusBadge({ uploaded, isCritical, className }: DocStatusBadgeProps) {
  if (uploaded) {
    return (
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700', className)}>
        Uploaded
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isCritical ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {isCritical ? 'Missing (Critical)' : 'Missing'}
    </span>
  )
}
