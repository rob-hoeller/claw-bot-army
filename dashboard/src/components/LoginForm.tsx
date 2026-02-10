'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [message, setMessage] = useState<string | null>(null)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (!supabase) {
      setError('System not configured')
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
      setStep('code')
      setMessage('Check your email for the 6-digit code')
    }
    setLoading(false)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!supabase) {
      setError('System not configured')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
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
        
        {step === 'email' ? (
          <>
            <h2 className="text-xl font-medium text-white text-center mb-2">
              Sign in to HBx
            </h2>
            <p className="text-gray-500 text-center text-sm mb-8">
              Enter your email to receive a code
            </p>

            <form onSubmit={handleSendCode} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gray-600 transition-colors"
                required
                autoFocus
              />

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-medium text-white text-center mb-2">
              Enter Code
            </h2>
            <p className="text-gray-500 text-center text-sm mb-2">
              Sent to {email}
            </p>
            {message && (
              <p className="text-green-500 text-center text-sm mb-6">{message}</p>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-black border border-gray-800 text-white px-4 py-4 rounded-lg focus:outline-none focus:border-gray-600 transition-colors text-center text-2xl tracking-[0.3em] font-mono"
                required
                autoFocus
              />

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(null); setMessage(null); }}
                className="w-full text-gray-500 hover:text-white text-sm transition-colors"
              >
                ← Use different email
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-gray-600 text-xs text-center mt-6">
        Schell Brothers AI Agent Network
      </p>
    </div>
  )
}
