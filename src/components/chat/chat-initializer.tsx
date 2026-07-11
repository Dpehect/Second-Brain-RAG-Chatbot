'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConversation } from '@/lib/actions/conversation'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ChatInitializer() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (initialized.current) return
    initialized.current = true

    async function init() {
      try {
        const id = await createConversation()
        router.push(`/dashboard/chat/${id}`)
      } catch (err: any) {
        console.error('Failed to auto-create conversation:', err)
        setError(err.message || 'Unknown error')
      }
    }
    
    init()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-neutral-900 p-6 text-center space-y-4">
        <div className="rounded-full bg-red-950/20 p-4 border border-red-900/30 text-red-400 animate-pulse">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Sohbet Odası Başlatılamadı</h3>
          <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mx-auto">
            Veritabanı bağlantısı kurulamadı veya tablolar oluşturulmadı. Lütfen Supabase SQL betiklerini çalıştırdığınızdan emin olun.
          </p>
        </div>
        
        <div className="max-w-md w-full bg-neutral-950/60 border border-neutral-850 p-3.5 rounded-xl text-left">
          <p className="text-[10px] font-mono text-red-400 break-all leading-normal">
            Hata Kodu / Mesajı: {error}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => {
              setError(null)
              initialized.current = false
              window.location.reload()
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/10 cursor-pointer"
          >
            Yeniden Dene
          </button>
          <a 
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-850 px-4 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors border border-neutral-800 cursor-pointer"
          >
            Panele Dön
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-900 text-neutral-400">
      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mb-3" />
      <p className="text-sm font-medium text-white">Sohbet odası hazırlanıyor...</p>
      <p className="text-xs text-neutral-500 mt-1">Lütfen bekleyin...</p>
    </div>
  )
}
