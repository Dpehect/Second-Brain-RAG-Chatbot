'use client'

import { useActionState } from 'react'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Brain, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await login(formData)
      if (result?.error) {
        return { error: result.error }
      }
      return null
    },
    null
  )

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-4 overflow-hidden">
      {/* Decorative background glow blobs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

      <Card className="relative w-full max-w-md border-neutral-800 bg-neutral-950/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-3">
            <div className="rounded-2xl bg-neutral-900 p-3 border border-neutral-800 text-violet-400 shadow-inner">
              <Brain className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            SecondBrain AI
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Log in to access your personal AI knowledge base
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
              <Label htmlFor="email" className="text-neutral-300">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-violet-500"
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
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-violet-500"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20 transition-all duration-300 active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
            <div className="text-center text-sm text-neutral-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-violet-400 hover:text-violet-300 hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
