import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/onboarding')

  const [workspace, user, careRecipient] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: session.user.workspaceId }, select: { name: true, situationType: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, role: true } }),
    prisma.careRecipient.findUnique({ where: { workspaceId: session.user.workspaceId } }),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Workspace configuration and account preferences." />

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="text-slate-900 font-medium">{workspace?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Situation</span>
                <span className="text-slate-900 capitalize">{workspace?.situationType?.replace('_', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Care Recipient Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {careRecipient ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Full name</span>
                  <span className="text-slate-900 font-medium">{careRecipient.fullLegalName}</span>
                </div>
                {careRecipient.dateOfBirth && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of birth</span>
                    <span className="text-slate-900">{careRecipient.dateOfBirth}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Care setting</span>
                  <span className="text-slate-900 capitalize">{careRecipient.careSettingType?.replace(/_/g, ' ')}</span>
                </div>
                {careRecipient.knownAllergies && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Known allergies</span>
                    <span className="text-slate-900">{careRecipient.knownAllergies}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No care recipient profile created.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="text-slate-900">{user?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <span className="text-slate-900 capitalize">{user?.role || 'Member'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Caregiver Command Center helps families organize caregiving information. It does not provide legal, medical,
              or financial advice, and does not create a professional relationship. Always consult a licensed attorney,
              physician, or financial advisor for decisions that require professional judgment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
