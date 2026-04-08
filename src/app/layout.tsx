import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caregiver Command Center',
  description: 'Coordinate care for your aging parent with confidence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
