import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function RootPage() {
  const session = await auth()

  if (session?.user) {
    if (session.user.workspaceId) {
      redirect('/dashboard')
    } else {
      redirect('/onboarding')
    }
  }

  redirect('/login')
}
