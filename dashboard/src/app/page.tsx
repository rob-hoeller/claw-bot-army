"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import LoginForm from "@/components/LoginForm"
import TwoFactorVerify from "@/components/TwoFactorVerify"
import Settings from "@/components/Settings"
import Dashboard from "@/components/Dashboard"
import AgentsPage from "@/components/AgentsPage"
import AppShell from "@/components/AppShell"
import { FeatureBoard } from "@/components/features"
import { MonitoringPage } from "@/components/MonitoringPage"
import { TokenUsagePage } from "@/components/TokenUsagePage"
import { OrchestratorPanel } from "@/components/orchestrator"
import { Loader2 } from "lucide-react"

// Placeholder pages for navigation
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-white/40">Coming soon</p>
      </div>
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState("dashboard")

  const isConfigured = Boolean(supabase)

  const refreshUser = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setTwoFactorEmail(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    setCurrentPage("dashboard")
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center">
            <span className="text-4xl font-bold tracking-tight">
              <span className="text-white/70">H</span>
              <span className="text-white/70">B</span>
              <span className="text-white/50">x</span>
            </span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </motion.div>
      </main>
    )
  }

  // Not configured
  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
        <div className="flex items-center">
          <span className="text-4xl font-bold tracking-tight">
            <span className="text-white/70">H</span>
            <span className="text-white/70">B</span>
            <span className="text-white/50">x</span>
          </span>
        </div>
        <p className="text-red-400">Configuration error</p>
      </main>
    )
  }

  // 2FA verification step
  if (twoFactorEmail) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <TwoFactorVerify
            key="2fa"
            email={twoFactorEmail}
            onBack={() => setTwoFactorEmail(null)}
          />
        </AnimatePresence>
      </main>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <LoginForm key="login" onNeed2FA={(email) => setTwoFactorEmail(email)} />
        </AnimatePresence>
      </main>
    )
  }

  // Logged in - App Shell
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "network":
        return (
          <div className="h-[calc(100vh-8rem)]">
            <OrchestratorPanel className="h-full" />
          </div>
        )
      case "agents":
        return <AgentsPage userEmail={user?.email} userMetadata={user?.user_metadata} supabaseUserId={user?.id} />
      case "features":
        return <FeatureBoard />
      case "monitoring":
        return <MonitoringPage />
      case "usage":
        return <TokenUsagePage />
      case "bugs":
        return <PlaceholderPage title="Bugs" />
      case "settings":
        return <Settings user={user} onUpdate={refreshUser} embedded />
      case "users":
        return <PlaceholderPage title="Users" />
      case "roles":
        return <PlaceholderPage title="Roles" />
      case "tenants":
        return <PlaceholderPage title="Business Units" />
      case "audit":
        return <PlaceholderPage title="Audit Log" />
      default:
        return <Dashboard />
    }
  }

  return (
    <AppShell
      user={user}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onSignOut={handleSignOut}
      onSettingsClick={() => setCurrentPage("settings")}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
