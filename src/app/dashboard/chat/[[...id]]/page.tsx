import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createConversation } from '@/lib/actions/conversation'
import ChatBox from '@/components/chat/chat-box'

export const dynamic = 'force-dynamic'

interface ChatPageProps {
  params: Promise<{
    id?: string[]
  }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const resolvedParams = await params
  const idArray = resolvedParams.id
  const activeId = idArray && idArray.length > 0 ? idArray[0] : null

  // If no chat ID exists, immediately create a new chat and redirect
  if (!activeId) {
    let newChatId = ''
    try {
      newChatId = await createConversation()
    } catch (err) {
      console.error('Failed to auto-create conversation:', err)
      return (
        <div className="flex flex-1 items-center justify-center bg-neutral-900 text-neutral-400">
          <p>Failed to initialize a new chat session. Check database connection.</p>
        </div>
      )
    }
    redirect(`/dashboard/chat/${newChatId}`)
  }

  const supabase = await createClient()

  // 1. Verify user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch conversation details to verify ownership
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', activeId)
    .eq('user_id', user.id)
    .single()

  if (convError || !conversation) {
    // If conversation doesn't exist or isn't owned by this user, redirect to main chat page (which will create a new one)
    redirect('/dashboard/chat')
  }

  // 3. Fetch past messages for this conversation
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', activeId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <ChatBox
      conversationId={activeId}
      initialMessages={messages ?? []}
    />
  )
}
