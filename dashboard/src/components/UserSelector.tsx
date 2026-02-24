"use client"

import { useState, useRef, useEffect } from "react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { ChevronDown } from "lucide-react"

export function UserSelector() {
  const { userId, userName, setUser, users } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        <span className="text-sm">👤</span>
        <span>{userName ?? "Select user"}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-white/10 bg-[#0a0a0a] shadow-xl">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => { setUser(u.id); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/10 ${
                u.id === userId ? "text-white bg-white/5" : "text-white/60"
              }`}
            >
              <span className="text-sm">👤</span>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
