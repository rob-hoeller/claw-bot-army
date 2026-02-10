'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface TwoFactorVerifyProps {
  email: string
  onBack: () => void
}

export default function TwoFactorVerify({ email, onBack }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true

    const doSend = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
      setLoading(false)
    }

    doSend()
  }, [email])

  const resendCode = async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-medium text-white text-center mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-500 text-center text-sm mb-2">
          Enter the code sent to
        </p>
        <p className="text-gray-300 text-center text-sm mb-6">
          {email}
        </p>

        {sent && (
          <p className="text-green-500 text-center text-sm mb-4">
            Code sent! Check your email.
          </p>
        )}

        <form onSubmit={verifyCode} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full bg-black border border-gray-800 text-white px-4 py-4 rounded-lg focus:outline-none focus:border-gray-600 transition-colors text-center text-2xl tracking-[0.3em] font-mono"
            required
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
