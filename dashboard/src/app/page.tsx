'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import LoginForm from '@/components/LoginForm'
import HBxLogo from '@/components/HBxLogo'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  // Only show loading if supabase is configured
  const [loading, setLoading] = useState(Boolean(supabase))
  
  // Check configuration immediately (not in effect)
  const isConfigured = Boolean(supabase)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <HBxLogo />
      </main>
    )
  }

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
        <HBxLogo />
        <p className="text-red-500">Configuration error: Supabase credentials not set</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-12">
        <HBxLogo />
        <LoginForm />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      <HBxLogo />
      <div className="text-center">
        <p className="text-gray-400 text-xl mb-4">
          Welcome, {user.user_metadata?.full_name || user.email}
        </p>
        <p className="text-gray-500 text-2xl font-light italic">
          &ldquo;Are you Clawd-Pilled yet?&rdquo;
        </p>
      </div>
      <button
        onClick={() => supabase?.auth.signOut()}
        className="mt-8 px-6 py-2 text-gray-500 border border-gray-700 rounded hover:border-gray-500 hover:text-gray-300 transition-colors"
      >
        Sign Out
      </button>
    </main>
  )
}
