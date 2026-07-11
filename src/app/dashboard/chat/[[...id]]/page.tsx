import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatBox from '@/components/chat/chat-box'
import ChatInitializer from '@/components/chat/chat-initializer'

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

  // If no chat ID exists, render the client-side ChatInitializer
  if (!activeId) {
    return <ChatInitializer />
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
