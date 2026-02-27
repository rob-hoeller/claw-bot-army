"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Home,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Bot,
  Rocket,
  BarChart3,
  ChevronDown,
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
  { id: "dashboard", label: "Home", icon: Home },
  { id: "mission-control", label: "Missions", icon: Rocket },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "platform", label: "Platform", icon: BarChart3 },
]

export default function Sidebar({ 
  currentPage, 
  onNavigate, 
  open, 
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [adminExpanded, setAdminExpanded] = useState(false)

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
          "fixed left-0 top-0 z-50 h-full border-r border-white/5 bg-black/95 backdrop-blur-xl transition-all duration-300 md:static md:translate-x-0 flex flex-col",
          collapsed ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* HBx Logo/Branding */}
        <div className={cn(
          "flex h-16 items-center border-b border-white/5",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center",
              collapsed ? "w-10 h-10" : "w-8 h-8"
            )}>
              <span className={cn("font-bold tracking-tight", collapsed ? "text-base" : "text-sm")}>
                <span className="text-purple-400">H</span>
                <span className="text-blue-400">B</span>
                <span className="text-purple-300">x</span>
              </span>
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-white">
                HBx Platform
              </span>
            )}
          </div>
          
          {/* Mobile close button */}
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>

          {/* Desktop collapse toggle */}
          {!collapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:block p-1.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          
          {collapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:block absolute right-3 top-5 p-1.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
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
                  "relative flex w-full items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed 
                    ? "justify-center p-3" 
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/5 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-8 before:bg-gradient-to-b before:from-purple-400 before:to-amber-400 before:rounded-full"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-purple-400" : "text-white/40")} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom Section: Settings + Admin */}
        <div className={cn("border-t border-white/10 space-y-1", collapsed ? "p-2" : "p-3")}>
          {/* Settings */}
          <button
            onClick={() => {
              onNavigate("settings")
              onClose?.()
            }}
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "relative flex w-full items-center rounded-lg text-sm font-medium transition-all duration-200",
              collapsed 
                ? "justify-center p-3" 
                : "gap-3 px-3 py-2.5",
              currentPage === "settings"
                ? "bg-white/5 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-8 before:bg-gradient-to-b before:from-purple-400 before:to-amber-400 before:rounded-full"
                : "text-white/50 hover:bg-white/5 hover:text-white/70"
            )}
          >
            <Settings className={cn("h-5 w-5 shrink-0 transition-colors", currentPage === "settings" ? "text-purple-400" : "text-white/40")} />
            {!collapsed && <span>Settings</span>}
          </button>

          {/* Admin Section (Collapsible, Empty for now) */}
          {!collapsed && (
            <div className="pt-2">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-white/40 hover:text-white/60 transition-all"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", adminExpanded && "rotate-180")} />
                <span>Admin</span>
              </button>
              
              {adminExpanded && (
                <div className="pl-3 pt-1 space-y-1">
                  <div className="px-3 py-2 text-xs text-white/30 italic">
                    Coming soon
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
