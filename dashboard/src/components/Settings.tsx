'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface SettingsProps {
  user: User
  onClose: () => void
  onUpdate: () => void
}

export default function Settings({ user, onClose, onUpdate }: SettingsProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const has2FA = user.user_metadata?.two_factor_enabled || false

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    if (!supabase) {
      setError('System not configured')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  const toggle2FA = async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      data: {
        two_factor_enabled: !has2FA
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage(has2FA ? '2FA disabled' : '2FA enabled')
      onUpdate()
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Account Info */}
        <div className="space-y-3 mb-6 pb-6 border-b border-gray-800">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Email</span>
            <span className="text-gray-300 text-sm">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Name</span>
            <span className="text-gray-300 text-sm">{user.user_metadata?.full_name || '—'}</span>
          </div>
        </div>

        {/* 2FA Toggle */}
        <div className="mb-6 pb-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white text-sm font-medium">Two-Factor Auth</p>
              <p className="text-gray-500 text-xs">Email verification on login</p>
            </div>
            <button
              onClick={toggle2FA}
              disabled={loading}
              className={`w-12 h-6 rounded-full transition-colors ${
                has2FA ? 'bg-green-500' : 'bg-gray-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                has2FA ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <p className="text-white text-sm font-medium">Change Password</p>
          
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-black border border-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gray-600"
          />
          
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-black border border-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-gray-600"
          />

          <label className="flex items-center gap-2 text-gray-500 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-gray-600 bg-black"
            />
            Show passwords
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-gray-800 text-white font-medium py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
