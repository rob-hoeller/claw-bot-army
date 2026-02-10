"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  User as UserIcon,
  Shield,
  Key,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import CardSection from "@/components/CardSection"
import PageHeader from "@/components/PageHeader"

interface SettingsProps {
  user: User
  onClose?: () => void
  onUpdate: () => void
  embedded?: boolean
}

export default function Settings({ user, onClose, onUpdate, embedded = false }: SettingsProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("account")

  const has2FA = user.user_metadata?.two_factor_enabled || false

  const initials = (user.user_metadata?.full_name || user.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    if (!supabase) {
      setError("System not configured")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage("Password updated successfully!")
      setNewPassword("")
      setConfirmPassword("")
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
        two_factor_enabled: !has2FA,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage(
        has2FA
          ? "Two-factor authentication disabled"
          : "Two-factor authentication enabled!"
      )
      onUpdate()
    }
    setLoading(false)
  }

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Messages */}
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
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3"
        >
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{message}</p>
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="account" className="gap-2">
            <UserIcon className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
            {has2FA && (
              <Badge variant="success" className="ml-1 py-0">
                2FA
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <CardSection title="Profile Information">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 text-2xl">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wide">
                      Full Name
                    </label>
                    <p className="mt-1 text-white">
                      {user.user_metadata?.full_name || "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wide">
                      Email
                    </label>
                    <p className="mt-1 text-white">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wide">
                      Role
                    </label>
                    <p className="mt-1 text-white">
                      {user.user_metadata?.role || "Admin"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wide">
                      Status
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardSection>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* 2FA Section */}
          <CardSection
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            action={
              <Badge variant={has2FA ? "success" : "outline"}>
                {has2FA ? "Enabled" : "Disabled"}
              </Badge>
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <Shield className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white">Email Verification</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Receive a code via email on each sign in
                  </p>
                </div>
              </div>
              <Button
                variant={has2FA ? "outline" : "default"}
                size="sm"
                onClick={toggle2FA}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : has2FA ? (
                  "Disable"
                ) : (
                  "Enable"
                )}
              </Button>
            </div>
          </CardSection>

          {/* Password Section */}
          <CardSection
            title="Change Password"
            description="Update your password to keep your account secure"
          >
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardSection>

          {/* Sessions Section */}
          <CardSection
            title="Active Sessions"
            description="Manage your active sessions across devices"
          >
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-2.5">
                  <Clock className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-white">Current Session</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Active now • This device
                  </p>
                </div>
              </div>
              <Badge variant="success">Current</Badge>
            </div>
          </CardSection>
        </TabsContent>
      </Tabs>
    </motion.div>
  )

  // If embedded in the app shell, render without the modal wrapper
  if (embedded) {
    return (
      <div>
        <PageHeader
          title="Settings"
          description="Manage your account settings and security preferences"
        />
        {content}
      </div>
    )
  }

  // Modal view (for non-app-shell contexts)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-2xl px-4"
    >
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="p-6">{content}</div>
      </div>
    </motion.div>
  )
}
