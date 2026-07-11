'use client'

import { useState, useTransition } from 'react'
import { FileText, Trash2, Calendar, HardDrive, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { deleteDocument } from '@/lib/actions/document'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  name: string
  size: number
  mime_type: string
  status: string
  error_message: string | null
  created_at: string
}

interface DocumentListProps {
  documents: Document[]
}

export default function DocumentList({ documents }: DocumentListProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will remove all its knowledge chunks.`)) {
      setDeletingId(id)
      startTransition(async () => {
        try {
          const res = await deleteDocument(id)
          if (res?.error) {
            toast.error(res.error)
          } else {
            toast.success(`"${name}" deleted successfully.`)
          }
        } catch (err: any) {
          toast.error(`Error deleting file: ${err.message}`)
        } finally {
          setDeletingId(null)
        }
      })
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, errMsg: string | null) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2 py-1 text-xs font-medium text-neutral-400 border border-neutral-800">
            <Clock className="h-3 w-3 animate-pulse" />
            Pending
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )
      case 'failed':
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 border border-red-500/20 cursor-help"
            title={errMsg || 'Vector processing failed.'}
          >
            <AlertTriangle className="h-3 w-3" />
            Failed
          </span>
        )
      default:
        return null
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950/20 p-12 text-center">
        <FileText className="h-10 w-10 text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-400 font-medium">No documents uploaded yet</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
          Upload PDF, TXT or Markdown files above to start chatting with your own personal data.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/20">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-neutral-400">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/50 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Size</th>
              <th className="px-6 py-4">Uploaded</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {documents.map((doc) => {
              const isDeleting = deletingId === doc.id
              return (
                <tr
                  key={doc.id}
                  className="hover:bg-neutral-900/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-neutral-900 p-2 border border-neutral-800 text-cyan-400 shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white truncate max-w-xs md:max-w-sm lg:max-w-md">
                          {doc.name}
                        </span>
                        {doc.status === 'failed' && doc.error_message && (
                          <span className="text-xs text-red-400 truncate max-w-xs mt-0.5">
                            {doc.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs">
                      <HardDrive className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      {formatSize(doc.size)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      {formatDate(doc.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doc.status, doc.error_message)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={isDeleting || isPending}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition-colors"
                      title="Delete document"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
