'use client'

import { useActionState } from 'react'
import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Brain, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await signup(formData)
      if (result?.error) {
        return { error: result.error }
      }
      return null
    },
    null
  )

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-4 overflow-hidden">
      {/* Decorative background glow blobs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

      <Card className="relative w-full max-w-md border-neutral-800 bg-neutral-950/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-3">
            <div className="rounded-2xl bg-neutral-900 p-3 border border-neutral-800 text-cyan-400 shadow-inner">
              <Brain className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Sign up to get started with your personal AI knowledge base
          </CardDescription>
        </CardHeader>
        
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/50 p-3 text-sm text-red-400">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-neutral-300">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-cyan-500"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-850" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-950 px-2 text-neutral-500">
                  Or connect with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white cursor-pointer h-10 transition-colors"
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>

            <div className="text-center text-sm text-neutral-400 pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
