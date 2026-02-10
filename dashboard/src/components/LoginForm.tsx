'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface LoginFormProps {
  onNeed2FA?: (email: string) => void
}

export default function LoginForm({ onNeed2FA }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!supabase) {
      setError('System not configured')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if user has 2FA enabled (stored in user metadata)
    if (data.user?.user_metadata?.two_factor_enabled && onNeed2FA) {
      // Sign out temporarily and trigger 2FA flow
      await supabase.auth.signOut()
      onNeed2FA(email)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-medium text-white text-center mb-2">
          Sign in to HBx
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8">
          Master Orchestrator Dashboard
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gray-600 transition-colors"
              required
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:border-gray-600 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-gray-600 text-xs text-center mt-6">
        Schell Brothers AI Agent Network
      </p>
    </div>
  )
}
