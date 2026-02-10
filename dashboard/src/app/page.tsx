'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import LoginForm from '@/components/LoginForm'
import TwoFactorVerify from '@/components/TwoFactorVerify'
import Settings from '@/components/Settings'
import HBxLogo from '@/components/HBxLogo'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  
  const isConfigured = Boolean(supabase)

  const refreshUser = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setTwoFactorEmail(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <HBxLogo />
      </main>
    )
  }

  // Not configured
  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
        <HBxLogo />
        <p className="text-red-500">Configuration error</p>
      </main>
    )
  }

  // 2FA verification step
  if (twoFactorEmail) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-10 p-4">
        <HBxLogo />
        <TwoFactorVerify
          email={twoFactorEmail}
          onBack={() => setTwoFactorEmail(null)}
        />
      </main>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-10 p-4">
        <HBxLogo />
        <LoginForm onNeed2FA={(email) => setTwoFactorEmail(email)} />
      </main>
    )
  }

  // Settings panel
  if (showSettings) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-10 p-4">
        <HBxLogo />
        <Settings
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdate={refreshUser}
        />
      </main>
    )
  }

  // Logged in - Dashboard
  const has2FA = user.user_metadata?.two_factor_enabled

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4">
      <HBxLogo />
      
      <div className="text-center">
        <p className="text-gray-400 text-lg mb-2">
          Welcome, {user.user_metadata?.full_name || user.email}
        </p>
        <p className="text-gray-600 text-xl italic">
          &ldquo;Are you Clawd-Pilled yet?&rdquo;
        </p>
      </div>

      {/* Security Status */}
      <div className={`flex items-center gap-2 text-sm ${has2FA ? 'text-green-500' : 'text-yellow-500'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        {has2FA ? '2FA Enabled' : '2FA Not Enabled'}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setShowSettings(true)}
          className="px-5 py-2 text-gray-400 border border-gray-800 rounded-lg hover:border-gray-600 hover:text-white transition-colors text-sm"
        >
          Settings
        </button>
        <button
          onClick={() => supabase?.auth.signOut()}
          className="px-5 py-2 text-gray-400 border border-gray-800 rounded-lg hover:border-gray-600 hover:text-white transition-colors text-sm"
        >
          Sign Out
        </button>
      </div>
    </main>
  )
}
