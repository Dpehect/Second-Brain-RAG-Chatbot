import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Route handler to process Supabase OAuth redirects.
 * Exchanges the auth code for a secure HTTP-only cookie session and redirects to dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      
      // If deployed on Vercel behind a proxy, redirect using the forwarded host header
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to login with error query param on failure
  return NextResponse.redirect(`${origin}/login?error=OAuth authentication failed`)
}
