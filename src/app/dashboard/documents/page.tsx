import { createClient } from '@/lib/supabase/server'
import UploadZone from '@/components/documents/upload-zone'
import DocumentList from '@/components/documents/document-list'
import { Files } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function DocumentsPage() {
  const supabase = await createClient()

  // Fetch documents list
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, size, mime_type, status, error_message, analysis, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-tr from-cyan-600 to-violet-500 p-2.5 text-white">
            <Files className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Knowledge Base
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Upload, manage, and process documents to build your personal AI context.
            </p>
          </div>
        </div>

        {/* Upload Zone Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-base font-semibold text-white mb-4">
            Upload Document
          </h2>
          <UploadZone />
        </div>

        {/* Documents List Section */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">
            My Documents ({documents?.length || 0})
          </h2>
          <DocumentList documents={documents ?? []} />
        </div>
      </div>
    </div>
  )
}
