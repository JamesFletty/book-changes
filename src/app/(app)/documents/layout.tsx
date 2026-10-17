import { Suspense } from 'react'

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading documents...</div>}>
      {children}
    </Suspense>
  )
}
