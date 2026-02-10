"use client"

import { useState } from "react"
import { User } from "@supabase/supabase-js"
import Header from "./Header"
import Sidebar from "./Sidebar"

interface AppShellProps {
  user: User
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
  onSignOut: () => void
  onSettingsClick: () => void
}

export default function AppShell({
  user,
  children,
  currentPage,
  onNavigate,
  onSignOut,
  onSettingsClick,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black">
      <Header
        user={user}
        onSignOut={onSignOut}
        onSettingsClick={onSettingsClick}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="flex">
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
