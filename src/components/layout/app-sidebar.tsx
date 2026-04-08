'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Grid3X3,
  FileText,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Settings,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/domains', label: 'Domains', icon: Grid3X3 },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/family', label: 'Family', icon: Users },
  { href: '/funding', label: 'Funding', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <Heart className="h-6 w-6 text-indigo-400 mr-2" />
        <span className="text-white font-semibold text-lg">Caregiver CC</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <Link
            href="/crisis"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/crisis'
                ? 'bg-red-600 text-white'
                : 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Crisis Mode
          </Link>
        </div>
      </nav>
    </div>
  )
}
