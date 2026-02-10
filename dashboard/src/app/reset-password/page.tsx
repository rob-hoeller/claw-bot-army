'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import HBxLogo from '@/components/HBxLogo'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession()
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (!supabase) {
      setError('Supabase not configured')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
        <HBxLogo />
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-6 py-4">
          <p className="text-green-400">Password updated successfully! Redirecting...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-12 p-4">
      <HBxLogo />
      
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/50">
          <h2 className="text-2xl font-semibold text-white text-center mb-2">
            Set New Password
          </h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            Enter your new password below
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 text-gray-200 px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder-gray-500"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 text-gray-200 px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder-gray-500"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-gray-600"
              />
              Show passwords
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-900 font-semibold py-3.5 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
