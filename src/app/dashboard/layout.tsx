import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/chat/sidebar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Fetch profiles table for metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Fetch conversations history
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .order('updated_at', { ascending: false })

  const userData = {
    email: user.email ?? '',
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans md:flex-row flex-col">
      {/* Sidebar navigation */}
      <Sidebar user={userData} conversations={conversations ?? []} />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-900 text-neutral-100 overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
