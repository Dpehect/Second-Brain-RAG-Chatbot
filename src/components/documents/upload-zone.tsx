'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileText, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadAndProcessDocument } from '@/lib/actions/document'
import { toast } from 'sonner'

export default function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    const isTxtOrMdOrDoc = 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.docx') || 
      file.name.endsWith('.doc')
    
    if (!validTypes.includes(file.type) && !isTxtOrMdOrDoc) {
      toast.error('Invalid file type. Only PDF, Word (DOCX), TXT, and Markdown files are supported.')
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      toast.error('File size exceeds the 10MB limit.')
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    toast.info(`Uploading "${selectedFile.name}"... Starting RAG indexing.`)

    try {
      const result = await uploadAndProcessDocument(formData)
      if (result?.error) {
        toast.error(`Failed: ${result.error}`)
      } else {
        toast.success(`"${selectedFile.name}" uploaded and indexed successfully!`)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err: any) {
      toast.error(`Error uploading: ${err.message || 'Something went wrong'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const selectFile = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragActive
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-neutral-800 bg-neutral-950/20 hover:border-neutral-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx,.doc"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <div className="rounded-full bg-neutral-900 p-4 border border-neutral-800 text-neutral-400 mb-4 group-hover:scale-105 transition-transform duration-300">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          ) : (
            <UploadCloud className="h-8 w-8 text-neutral-400" />
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-white font-medium">
              <FileText className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="truncate max-w-xs">{selectedFile.name}</span>
            </div>
            <p className="text-xs text-neutral-400">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Drag & drop your file here, or{' '}
              <button
                type="button"
                onClick={selectFile}
                className="text-violet-400 hover:text-violet-300 underline font-medium focus:outline-none"
              >
                browse
              </button>
            </p>
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-450">
                Supports PDF, DOCX, DOC (Word), TXT, or Markdown
              </p>
              <div className="inline-flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20 mx-auto">
                ⚠️ Sunucu Limit Sınırı: En Fazla 10 MB
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex justify-end gap-2.5">
          <Button
            variant="ghost"
            disabled={isUploading}
            onClick={() => {
              setSelectedFile(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            disabled={isUploading}
            onClick={handleUpload}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/10"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing RAG...
              </>
            ) : (
              'Upload & Index'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
