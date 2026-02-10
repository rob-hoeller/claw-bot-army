"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TwoFactorVerifyProps {
  email: string
  onBack: () => void
}

export default function TwoFactorVerify({ email, onBack }: TwoFactorVerifyProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Send OTP on mount
  useEffect(() => {
    sendOTP()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendOTP = async () => {
    if (!supabase) return
    setResending(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      setError(error.message)
    }
    setResending(false)
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (newCode.every((c) => c) && newCode.join("").length === 6) {
      verifyOTP(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newCode = [...code]
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i]
    }
    setCode(newCode)
    if (pastedData.length === 6) {
      verifyOTP(pastedData)
    }
  }

  const verifyOTP = async (otpCode: string) => {
    if (!supabase) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    })

    if (error) {
      setError("Invalid code. Please try again.")
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
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
      <Card className="border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center pb-2">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex justify-center mb-4"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
              <Mail className="h-7 w-7 text-blue-400" />
            </div>
          </motion.div>

          <CardTitle className="text-2xl font-semibold text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-white/40">
            We sent a verification code to
            <br />
            <span className="text-white/60 font-medium">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Code Input */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-semibold rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 disabled:opacity-50 transition-all"
              />
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 mb-6 text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verifying...</span>
            </div>
          )}

          {/* Resend */}
          <div className="text-center mb-6">
            <p className="text-sm text-white/40 mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={sendOTP}
              disabled={resending}
              className="text-white/70 hover:text-white"
            >
              {resending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend code
                </>
              )}
            </Button>
          </div>

          {/* Back Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onBack}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>

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
