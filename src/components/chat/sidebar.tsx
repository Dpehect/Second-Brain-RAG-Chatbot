'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { Brain, MessageSquare, Files, Plus, LogOut, Trash2, Menu, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from '@/app/(auth)/actions'
import { createConversation, deleteConversation } from '@/lib/actions/conversation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: {
    email: string | null
    fullName: string | null
    avatarUrl: string | null
  }
  conversations: Array<{
    id: string
    title: string
    created_at: string
  }>
}

export default function Sidebar({ user, conversations }: SidebarProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeChatId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null

  const handleNewChat = () => {
    startTransition(async () => {
      try {
        await createConversation()
        setIsOpen(false)
      } catch (err) {
        console.error('Error creating conversation:', err)
      }
    })
  }

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this chat?')) {
      setDeletingId(id)
      const res = await deleteConversation(id)
      setDeletingId(null)
      if (res?.success) {
        if (activeChatId === id) {
          router.push('/dashboard/chat')
        }
      }
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut()
    }
  }

  const initialLetter = user.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user.email
    ? user.email.charAt(0).toUpperCase()
    : 'U'

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-200 border-r border-neutral-900">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-neutral-900">
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90">
          <div className="rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-2 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SecondBrain AI
          </span>
        </Link>
      </div>

      {/* Navigation & New Chat */}
      <div className="p-4 space-y-2">
        <Button
          onClick={handleNewChat}
          disabled={isPending}
          className="w-full justify-start gap-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800/80 shadow-md shadow-black/40 hover:border-violet-500/30 transition-all duration-300"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 text-violet-400" />
          )}
          New Chat
        </Button>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link href="/dashboard/chat" onClick={() => setIsOpen(false)}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-center gap-2 text-xs h-9 bg-neutral-950 hover:bg-neutral-900",
                pathname.startsWith('/dashboard/chat') && "bg-neutral-900 text-violet-400 border border-neutral-800"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </Button>
          </Link>
          <Link href="/dashboard/documents" onClick={() => setIsOpen(false)}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-center gap-2 text-xs h-9 bg-neutral-950 hover:bg-neutral-900",
                pathname.startsWith('/dashboard/documents') && "bg-neutral-900 text-cyan-400 border border-neutral-800"
              )}
            >
              <Files className="h-3.5 w-3.5" />
              Files
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
        <div className="px-2 py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Chat History
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-sm text-neutral-600 text-center italic">
            No chats yet.
          </div>
        ) : (
          conversations.map((chat) => {
            const isActive = activeChatId === chat.id
            const isDeleting = deletingId === chat.id
            return (
              <Link
                key={chat.id}
                href={`/dashboard/chat/${chat.id}`}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:bg-neutral-900 hover:text-white",
                  isActive ? "bg-neutral-900 text-white font-medium border-l-2 border-violet-500" : "text-neutral-400"
                )}
              >
                <div className="flex items-center gap-2.5 overflow-hidden w-full pr-6">
                  <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-400" : "text-neutral-500")} />
                  <span className="truncate">{chat.title}</span>
                </div>
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-600 absolute right-3" />
                ) : (
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            )
          })
        )}
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-neutral-900 bg-neutral-950/80">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-neutral-900/40 border border-neutral-900/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-9 w-9 border border-neutral-800">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-neutral-800 text-violet-300 font-bold">
                {initialLetter}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-sm font-semibold truncate text-white">
                {user.fullName || 'User'}
              </span>
              <span className="text-xs text-neutral-500 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 shrink-0"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-950 bg-neutral-900 px-4 text-white md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 p-1.5 text-white">
            <Brain className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SecondBrain AI
          </span>
        </Link>
        <div className="w-10" /> {/* Spacer to center name */}
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden h-screen w-64 shrink-0 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isOpen && (
        <div className="relative z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-64 max-w-xs flex-col shadow-xl animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-neutral-900 p-1.5 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-full">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
