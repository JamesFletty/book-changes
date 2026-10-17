'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FileText, Upload, Search, Filter, Star, AlertCircle, CheckCircle, X, Plus
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DOMAINS, DOCUMENT_TYPES } from '@/lib/constants'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  displayName: string
  documentTypeKey: string
  domainId: string | null
  domainKey: string | null
  isCritical: boolean
  physicalLocation: string | null
  notes: string | null
  createdAt: string
  currentVersionId: string | null
}

export default function DocumentsPage() {
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState(searchParams.get('domain') || '')
  const [filterCritical, setFilterCritical] = useState(false)
  const [showUpload, setShowUpload] = useState(searchParams.get('upload') === 'true')
  const [uploadData, setUploadData] = useState({
    displayName: '',
    documentTypeKey: searchParams.get('type') || '',
    domainKey: searchParams.get('domain') || '',
    isCritical: false,
    physicalLocation: '',
    notes: '',
    file: null as File | null,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const loadDocuments = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterDomain) params.set('domainKey', filterDomain)
    if (filterCritical) params.set('critical', 'true')
    const res = await fetch(`/api/documents?${params}`)
    if (res.ok) setDocuments(await res.json())
    setLoading(false)
  }, [search, filterDomain, filterCritical])

  useEffect(() => {
    let ignore = false
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterDomain) params.set('domainKey', filterDomain)
    if (filterCritical) params.set('critical', 'true')
    fetch(`/api/documents?${params}`)
      .then(async (res) => {
        if (ignore || !res.ok) return
        setDocuments(await res.json())
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [search, filterDomain, filterCritical])

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.documentTypeKey || !uploadData.domainKey) return
    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', uploadData.file)
    formData.append('displayName', uploadData.displayName || uploadData.file.name)
    formData.append('documentTypeKey', uploadData.documentTypeKey)
    formData.append('domainKey', uploadData.domainKey)
    formData.append('isCritical', String(uploadData.isCritical))
    formData.append('physicalLocation', uploadData.physicalLocation)
    formData.append('notes', uploadData.notes)

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    if (res.ok) {
      setShowUpload(false)
      setUploadData({ displayName: '', documentTypeKey: '', domainKey: '', isCritical: false, physicalLocation: '', notes: '', file: null })
      loadDocuments()
    } else {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error || 'Upload failed')
    }
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document? The file will be removed from your family workspace.')) return
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (res.ok) setDocuments((current) => current.filter((doc) => doc.id !== id))
  }

  const filteredDocs = documents.filter((doc) => {
    const q = search.toLowerCase()
    return (
      doc.displayName.toLowerCase().includes(q) ||
      (doc.notes?.toLowerCase().includes(q)) ||
      (doc.physicalLocation?.toLowerCase().includes(q))
    )
  })

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Documents"
        description="Upload and manage all caregiving documents. Mark critical documents so they surface in emergencies."
      >
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </PageHeader>

      {/* Upload modal */}
      {showUpload && (
        <Card className="mb-6 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Upload a Document</h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">File *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.heic"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setUploadData({ ...uploadData, file, displayName: uploadData.displayName || (file?.name || '') })
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Document name</label>
                <Input
                  placeholder="Display name (defaults to filename)"
                  value={uploadData.displayName}
                  onChange={(e) => setUploadData({ ...uploadData, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Domain *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={uploadData.domainKey}
                  onChange={(e) => setUploadData({ ...uploadData, domainKey: e.target.value })}
                >
                  <option value="">Select domain</option>
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Document type *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={uploadData.documentTypeKey}
                  onChange={(e) => setUploadData({ ...uploadData, documentTypeKey: e.target.value })}
                >
                  <option value="">Select type</option>
                  {DOCUMENT_TYPES.filter((t) => !uploadData.domainKey || t.domainKey === uploadData.domainKey || t.domainKey === null).map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Physical location</label>
                <Input
                  placeholder="e.g., Blue binder in hall closet"
                  value={uploadData.physicalLocation}
                  onChange={(e) => setUploadData({ ...uploadData, physicalLocation: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <Input
                  placeholder="Any notes about this document"
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="critical"
                  checked={uploadData.isCritical}
                  onChange={(e) => setUploadData({ ...uploadData, isCritical: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="critical" className="text-sm text-slate-700">
                  Mark as critical — this document is needed in emergencies
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {uploadError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadData.file || !uploadData.documentTypeKey || !uploadData.domainKey}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, notes, or location..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm min-w-[160px]"
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
        >
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
        <Button
          variant={filterCritical ? 'default' : 'outline'}
          size="sm"
          className="h-10"
          onClick={() => setFilterCritical(!filterCritical)}
        >
          <Star className="h-4 w-4 mr-2" />
          Critical only
        </Button>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-medium text-slate-700 mb-1">
            {search || filterDomain || filterCritical ? 'No documents match your filters' : 'No documents yet'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {search || filterDomain || filterCritical
              ? 'Try adjusting your search or filters.'
              : 'Start by uploading a power of attorney, insurance card, or other important document.'}
          </p>
          {!search && !filterDomain && !filterCritical && (
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" /> Upload first document
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {filteredDocs.map((doc, i) => {
            const domain = DOMAINS.find((d) => d.key === doc.domainKey)
            const docType = DOCUMENT_TYPES.find((t) => t.key === doc.documentTypeKey)
            return (
              <div
                key={doc.id}
                className={cn(
                  'flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-colors',
                  i < filteredDocs.length - 1 && 'border-b border-slate-100'
                )}
              >
                <div className="flex-shrink-0">
                  {doc.isCritical ? (
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.displayName}</p>
                    {doc.isCritical && (
                      <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                        Critical
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500">{docType?.label || doc.documentTypeKey}</span>
                    {domain && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-indigo-600">{domain.label}</span>
                      </>
                    )}
                    {doc.physicalLocation && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{doc.physicalLocation}</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a href={`/api/documents/${doc.id}/file`} className="text-xs text-indigo-600 hover:underline">
                    Download
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
