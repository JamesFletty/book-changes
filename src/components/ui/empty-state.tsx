import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 mb-4">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button size="sm">{action.label}</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  )
}
