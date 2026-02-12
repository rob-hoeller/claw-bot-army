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
  ChevronLeft,
  ChevronRight,
  Bot,
  Lightbulb,
  Bug,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const navItems = [
  { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "features", label: "Features", icon: Lightbulb },
  { id: "bugs", label: "Bugs", icon: Bug },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "tenants", label: "Business Units", icon: Building2 },
  { id: "audit", label: "Audit Log", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function Sidebar({ 
  currentPage, 
  onNavigate, 
  open, 
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
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
          "fixed left-0 top-0 z-50 h-full border-r border-white/5 bg-black/95 backdrop-blur-xl transition-all duration-300 md:static md:translate-x-0",
          collapsed ? "w-16" : "w-64",
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

        {/* Desktop spacer with collapse toggle */}
        <div className="hidden h-16 md:flex items-center justify-end px-3">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("space-y-1", collapsed ? "p-2" : "p-3")}>
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
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex w-full items-center rounded-lg text-sm font-medium transition-all",
                  collapsed 
                    ? "justify-center p-3" 
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-white/40")} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
