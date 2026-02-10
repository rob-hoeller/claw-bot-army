'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import LoginForm from '@/components/LoginForm'
import HBxLogo from '@/components/HBxLogo'
import MFASetup from '@/components/MFASetup'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [hasMFA, setHasMFA] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const isConfigured = Boolean(supabase)

  const checkMFAStatus = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) {
      const verifiedFactors = data.totp.filter(f => f.status === 'verified')
      setHasMFA(verifiedFactors.length > 0)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          checkMFAStatus()
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          checkMFAStatus()
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [checkMFAStatus])

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
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-12 p-4">
        <HBxLogo />
        <LoginForm />
      </main>
    )
  }

  if (showMFASetup) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-12 p-4">
        <HBxLogo />
        <MFASetup 
          onComplete={() => { setShowMFASetup(false); setHasMFA(true); }}
          onSkip={() => setShowMFASetup(false)}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 p-4">
      <HBxLogo />
      <div className="text-center">
        <p className="text-gray-400 text-xl mb-4">
          Welcome, {user.user_metadata?.full_name || user.email}
        </p>
        <p className="text-gray-500 text-2xl font-light italic">
          &ldquo;Are you Clawd-Pilled yet?&rdquo;
        </p>
      </div>

      {/* Security Status */}
      <div className="flex items-center gap-2 mt-4">
        {hasMFA ? (
          <span className="flex items-center gap-2 text-green-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            2FA Enabled
          </span>
        ) : (
          <button
            onClick={() => setShowMFASetup(true)}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Enable 2FA
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-6 py-2 text-gray-400 border border-gray-700 rounded-xl hover:border-gray-500 hover:text-gray-300 transition-colors"
        >
          Settings
        </button>
        <button
          onClick={() => supabase?.auth.signOut()}
          className="px-6 py-2 text-gray-400 border border-gray-700 rounded-xl hover:border-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-full max-w-md mt-4">
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-semibold mb-4">Account Settings</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Email</span>
                <span className="text-gray-200">{user.email}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Name</span>
                <span className="text-gray-200">{user.user_metadata?.full_name || 'Not set'}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Two-Factor Auth</span>
                <span className={hasMFA ? 'text-green-400' : 'text-yellow-400'}>
                  {hasMFA ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              {!hasMFA && (
                <button
                  onClick={() => setShowMFASetup(true)}
                  className="w-full py-2 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors"
                >
                  Set Up Two-Factor Auth
                </button>
              )}
              
              <button
                onClick={async () => {
                  if (supabase) {
                    await supabase.auth.resetPasswordForEmail(user.email!, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    })
                    alert('Password reset email sent!')
                  }
                }}
                className="w-full py-2 text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800/50 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
