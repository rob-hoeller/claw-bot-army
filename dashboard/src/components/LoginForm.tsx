"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormProps {
  onNeed2FA?: (email: string) => void
}

export default function LoginForm({ onNeed2FA }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!supabase) {
      setError("System not configured")
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-purple-500/20 bg-gradient-to-b from-purple-500/10 via-purple-900/5 to-transparent backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(147,51,234,0.25)]">
        <CardHeader className="space-y-1 text-center pb-2">
          {/* Robot Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex justify-center mb-4"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900/50 to-slate-900/80 border border-purple-500/20 shadow-lg">
              <svg className="w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="8" width="16" height="12" rx="3" />
                <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                <path d="M12 2v4" />
                <path d="M8 4h8" />
              </svg>
            </div>
          </motion.div>
          
          <CardTitle className="text-2xl font-semibold text-white">
            Welcome Back!
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-white/30">
              Schell Brothers AI Agent Network
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
