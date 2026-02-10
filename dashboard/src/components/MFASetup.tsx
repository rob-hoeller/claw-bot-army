'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface MFASetupProps {
  onComplete: () => void
  onSkip: () => void
}

export default function MFASetup({ onComplete, onSkip }: MFASetupProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const enrolledRef = useRef(false)

  useEffect(() => {
    if (enrolledRef.current) return
    enrolledRef.current = true

    const doEnroll = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'HBx Authenticator'
      })

      if (error) {
        setError(error.message)
      } else if (data) {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
        setStep('verify')
      }
      setLoading(false)
    }

    doEnroll()
  }, [])

  const verifyMFA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !factorId) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: verifyCode
    })

    if (error) {
      setError(error.message)
    } else {
      onComplete()
    }
    setLoading(false)
  }

  const retryEnroll = async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'HBx Authenticator'
    })

    if (error) {
      setError(error.message)
    } else if (data) {
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('verify')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/50">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white text-center mb-2">
          Set Up Two-Factor Auth
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Secure your account with an authenticator app
        </p>

        {loading && !qrCode ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : step === 'verify' && qrCode ? (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <Image src={qrCode} alt="MFA QR Code" width={192} height={192} unoptimized />
              </div>
            </div>

            {/* Secret Key */}
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-2">Or enter this code manually:</p>
              <p className="text-gray-200 font-mono text-sm break-all select-all">{secret}</p>
            </div>

            {/* Verify Form */}
            <form onSubmit={verifyMFA} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Enter 6-digit code from your app</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-gray-800/50 border border-gray-600/50 text-gray-200 px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder-gray-500 text-center text-2xl tracking-[0.5em] font-mono"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full bg-blue-500 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
            </form>

            <button
              onClick={onSkip}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-400">{error || 'Failed to set up MFA'}</p>
            <button
              onClick={retryEnroll}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
