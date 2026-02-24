"use client"

import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "hbx-current-user"

export interface HBxUser {
  id: string
  name: string
}

const USERS: HBxUser[] = [
  { id: "lance", name: "Lance Manlove" },
  { id: "rob-hoeller", name: "Rob Hoeller" },
  { id: "rob-lepard", name: "Rob Lepard" },
]

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEY)
  })

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUserId(e.newValue)
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const setUser = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setUserId(id)
  }, [])

  const userName = USERS.find((u) => u.id === userId)?.name ?? null

  return { userId, userName, setUser, users: USERS }
}
