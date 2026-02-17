'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { useDocument, useDocumentView } from '@/features/documents/hooks/useDocumentView'

export default function DocumentViewPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const { document, loading, error } = useDocument(documentId)
  const { openDocument, downloadDocument, loading: actionLoading, error: actionError } = useDocumentView()

  const handleView = () => openDocument(documentId)
  const handleDownload = () => downloadDocument(documentId)

  if (loading) {
    return (
      <DashboardLayout title="Loading Document..." breadcrumbs={[{ label: 'Documents', href: '/dashboard/documents' }]}>
        <div className="surface-border flex min-h-[360px] items-center justify-center rounded-2xl border-white/70 bg-white/82">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading document...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !document) {
    return (
      <DashboardLayout title="Document Not Found" breadcrumbs={[{ label: 'Documents', href: '/dashboard/documents' }]}>
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/documents')}
            className="w-fit rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>

          <Card className="surface-border border-white/70 bg-white/82 p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="font-display text-2xl font-semibold">Document Not Found</h1>
            <p className="mt-2 text-muted-foreground">{error || 'The requested document could not be found.'}</p>
            <Button onClick={() => router.push('/dashboard/documents')} className="mt-5">
              Go to Documents
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={document.name}
      breadcrumbs={[{ label: 'Documents', href: '/dashboard/documents' }, { label: document.name }]}
    >
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/documents')}
            className="w-fit rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-3xl font-semibold sm:text-4xl">{document.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Size: {(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                <span>Type: {document.file_type.toUpperCase()}</span>
                <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleView} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                View
              </Button>

              <Button onClick={handleDownload} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>

          {actionError && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{actionError}</p>
            </div>
          )}
        </section>

        <div className="grid gap-6">
          <Card className="surface-border border-white/70 bg-white/82 p-6">
            <h2 className="font-display text-2xl font-semibold">Document Information</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoField label="Filename" value={document.name} />
              <InfoField label="Original Name" value={document.original_name} />
              <InfoField label="File Type" value={document.file_type.toUpperCase()} />
              <InfoField label="File Size" value={`${(document.file_size / 1024 / 1024).toFixed(2)} MB`} />
              <InfoField label="Processing Status" value={document.status} capitalize />
              <InfoField label="Created" value={new Date(document.created_at).toLocaleString()} />
              <InfoField label="Last Updated" value={new Date(document.updated_at).toLocaleString()} />
            </div>
          </Card>

          <Card className="surface-border border-white/70 bg-white/82 p-6">
            <h2 className="font-display text-2xl font-semibold">Document Actions</h2>
            <div className="mt-4 space-y-4">
              <ActionRow
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="View Document"
                description="Open the document in a new tab for viewing."
                action={
                  <Button variant="outline" onClick={handleView} disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Open
                  </Button>
                }
              />

              <ActionRow
                icon={<Download className="h-8 w-8 text-muted-foreground" />}
                title="Download Document"
                description="Download the original document to your device."
                action={
                  <Button onClick={handleDownload} disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function InfoField({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  )
}

function ActionRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/70 bg-white/75 p-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
