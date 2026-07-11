'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Creates a new conversation and redirects the user to its chat page.
 */
export async function createConversation() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: conv, error: dbError } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: 'New Chat',
    })
    .select()
    .single()

  if (dbError || !conv) {
    throw new Error(`Failed to create conversation: ${dbError?.message}`)
  }

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/chat/${conv.id}`)
}

/**
 * Deletes a conversation by ID.
 */
export async function deleteConversation(id: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error: dbError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (dbError) {
    return { error: `Failed to delete conversation: ${dbError.message}` }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
