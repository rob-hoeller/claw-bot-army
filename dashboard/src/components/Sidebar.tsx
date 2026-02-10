"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  FileText,
  Settings,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  open?: boolean
  onClose?: () => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "tenants", label: "Business Units", icon: Building2 },
  { id: "audit", label: "Audit Log", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function Sidebar({ currentPage, onNavigate, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r border-white/5 bg-black/95 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4 md:hidden">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white/70">H</span>
            <span className="text-white/70">B</span>
            <span className="text-white/50">x</span>
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop spacer */}
        <div className="hidden h-16 md:block" />

        {/* Navigation */}
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  onClose?.()
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-white/40")} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/40">Platform Version</p>
            <p className="text-sm font-medium text-white/70">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
