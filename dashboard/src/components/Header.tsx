"use client"

import { User } from "@supabase/supabase-js"
import { Settings, LogOut, User as UserIcon, Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  user: User
  onSignOut: () => void
  onSettingsClick: () => void
  onMenuClick?: () => void
}

export default function Header({ user, onSignOut, onSettingsClick, onMenuClick }: HeaderProps) {
  const initials = (user.user_metadata?.full_name || user.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-white/70">H</span>
              <span className="text-white/70">B</span>
              <span className="text-white/50">x</span>
            </span>
            <span className="text-xs text-white/30 font-medium">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="text-white/60 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-white/50">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettingsClick}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} destructive>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
