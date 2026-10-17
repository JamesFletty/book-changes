import { Suspense } from 'react'

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading timeline...</div>}>
      {children}
    </Suspense>
  )
}
