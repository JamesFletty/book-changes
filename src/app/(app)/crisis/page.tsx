import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle, XCircle, Phone, FileText,
  Pill, Shield, User, Heart, ChevronRight, Plus
} from 'lucide-react'
import { DOCUMENT_TYPES } from '@/lib/constants'

async function getCrisisData(workspaceId: string) {
  const [careRecipient, contacts, documents] = await Promise.all([
    prisma.careRecipient.findUnique({ where: { workspaceId } }),
    prisma.contact.findMany({ where: { workspaceId } }),
    prisma.document.findMany({
      where: { workspaceId },
      select: { id: true, documentTypeKey: true, displayName: true, physicalLocation: true, isCritical: true },
    }),
  ])

  const docMap = Object.fromEntries(documents.map((d) => [d.documentTypeKey, d]))

  return { careRecipient, contacts, documents, docMap }
}

function PacketItem({
  label,
  value,
  missing,
  actionHref,
  actionLabel,
  subtext,
}: {
  label: string
  value?: string | null
  missing?: boolean
  actionHref?: string
  actionLabel?: string
  subtext?: string
}) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${missing ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex-shrink-0 mt-0.5">
        {missing ? (
          <XCircle className="h-5 w-5 text-red-500" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {value && <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>}
        {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
        {missing && (
          <p className="text-sm text-red-700 mt-0.5 font-medium">Missing</p>
        )}
      </div>
      {actionHref && (
        <Link href={actionHref} className="flex-shrink-0">
          <span className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
            {actionLabel || 'Add'} <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      )}
    </div>
  )
}

export default async function CrisisPage() {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/onboarding')

  const { careRecipient, contacts, documents, docMap } = await getCrisisData(session.user.workspaceId)

  const emergencyContacts = careRecipient?.emergencyContacts
    ? JSON.parse(careRecipient.emergencyContacts as string)
    : []

  const poaFinancial = docMap['poa_financial']
  const poaHealthcare = docMap['poa_healthcare']
  const livingWill = docMap['living_will']
  const dnr = docMap['dnr']
  const insuranceCard = docMap['insurance_card']
  const medicareCard = docMap['medicare_card']
  const medicationList = docMap['medication_list']

  const packetItems = [
    !!careRecipient?.fullLegalName,
    emergencyContacts.length > 0,
    !!poaFinancial,
    !!poaHealthcare,
    !!livingWill,
    !!insuranceCard,
    !!medicationList,
  ]
  const packetDone = packetItems.filter(Boolean).length
  const packetTotal = packetItems.length
  const isComplete = packetDone === packetTotal

  return (
    <div className="max-w-4xl mx-auto">
      {/* Crisis header */}
      <div className="bg-red-700 text-white rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Crisis Mode</h1>
        </div>
        <p className="text-red-100 text-sm">
          Fast access to the most critical information for emergencies, hospital transfers, or care decisions.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="text-sm font-medium">
            Emergency Packet: {packetDone}/{packetTotal} complete
          </div>
          <div className="flex-1 bg-red-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-400' : 'bg-yellow-300'}`}
              style={{ width: `${(packetDone / packetTotal) * 100}%` }}
            />
          </div>
          {isComplete && <span className="text-sm font-medium text-green-300">Ready</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Care Recipient</h2>
          </div>
          <PacketItem
            label="Full legal name"
            value={careRecipient?.fullLegalName}
            missing={!careRecipient?.fullLegalName}
            actionHref="/settings"
            actionLabel="Edit profile"
          />
          {careRecipient?.dateOfBirth && (
            <PacketItem
              label="Date of birth"
              value={careRecipient.dateOfBirth}
            />
          )}
          <PacketItem
            label="Current care setting"
            value={careRecipient?.careSettingType?.replace(/_/g, ' ')}
            missing={!careRecipient?.careSettingType}
          />
          {careRecipient?.knownAllergies && (
            <PacketItem
              label="Known allergies"
              value={careRecipient.knownAllergies}
            />
          )}
          {careRecipient?.primaryPhysicianName && (
            <PacketItem
              label="Primary physician"
              value={careRecipient.primaryPhysicianName}
              subtext={careRecipient.primaryPhysicianPhone || undefined}
            />
          )}
        </div>

        {/* Emergency contacts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Emergency Contacts</h2>
          </div>
          {emergencyContacts.length === 0 ? (
            <PacketItem
              label="Emergency contacts"
              missing
              actionHref="/settings"
              actionLabel="Add contacts"
            />
          ) : (
            emergencyContacts.map((c: { name: string; phone: string; relationship: string }, i: number) => (
              <PacketItem
                key={i}
                label={c.relationship || 'Contact'}
                value={c.name}
                subtext={c.phone}
              />
            ))
          )}
        </div>

        {/* Legal authority */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Legal Authority</h2>
          </div>
          <PacketItem
            label="Power of Attorney — Financial"
            value={poaFinancial?.displayName}
            missing={!poaFinancial}
            actionHref="/documents?upload=true&type=poa_financial&domain=legal_authority"
            actionLabel="Upload"
            subtext={poaFinancial?.physicalLocation ? `Physical copy: ${poaFinancial.physicalLocation}` : undefined}
          />
          <PacketItem
            label="Power of Attorney — Healthcare"
            value={poaHealthcare?.displayName}
            missing={!poaHealthcare}
            actionHref="/documents?upload=true&type=poa_healthcare&domain=legal_authority"
            actionLabel="Upload"
            subtext={poaHealthcare?.physicalLocation ? `Physical copy: ${poaHealthcare.physicalLocation}` : undefined}
          />
        </div>

        {/* Advance directives */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Advance Directives</h2>
          </div>
          <PacketItem
            label="Living Will / Advance Directive"
            value={livingWill?.displayName}
            missing={!livingWill}
            actionHref="/documents?upload=true&type=living_will&domain=advance_directives"
            actionLabel="Upload"
            subtext={livingWill?.physicalLocation ? `Physical copy: ${livingWill.physicalLocation}` : undefined}
          />
          <PacketItem
            label="DNR / POLST Form"
            value={dnr?.displayName}
            missing={!dnr}
            actionHref="/documents?upload=true&type=dnr&domain=advance_directives"
            actionLabel="Upload"
            subtext={dnr?.physicalLocation ? `Physical copy: ${dnr.physicalLocation}` : undefined}
          />
        </div>

        {/* Medications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Pill className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Medications</h2>
          </div>
          <PacketItem
            label="Current medication list"
            value={medicationList?.displayName}
            missing={!medicationList}
            actionHref="/documents?upload=true&type=medication_list&domain=healthcare"
            actionLabel="Upload"
          />
        </div>

        {/* Insurance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Insurance</h2>
          </div>
          <PacketItem
            label="Insurance card"
            value={insuranceCard?.displayName}
            missing={!insuranceCard}
            actionHref="/documents?upload=true&type=insurance_card&domain=benefits_funding"
            actionLabel="Upload"
          />
          <PacketItem
            label="Medicare card"
            value={medicareCard?.displayName}
            missing={!medicareCard}
            actionHref="/documents?upload=true&type=medicare_card&domain=benefits_funding"
            actionLabel="Upload"
          />
        </div>
      </div>

      {/* Log event CTA */}
      <div className="mt-8 p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
        <div>
          <p className="font-medium">Did something happen?</p>
          <p className="text-sm text-slate-400 mt-0.5">Log a trigger event to generate a follow-up review list.</p>
        </div>
        <Link href="/timeline?log=event">
          <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="h-4 w-4" /> Log Event
          </button>
        </Link>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        This information is for organizational purposes. Always consult licensed professionals for medical, legal, and financial decisions.
      </p>
    </div>
  )
}
