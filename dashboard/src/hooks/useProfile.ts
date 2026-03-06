"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export interface Profile {
  id: string         // slug
  authId: string     // uuid
  displayName: string
  email: string
  role: string
  avatarUrl: string | null
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    if (!supabase) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, auth_id, display_name, email, role, avatar_url")
      .eq("auth_id", userId)
      .single()

    if (error || !data) {
      setProfile(null)
    } else {
      setProfile({
        id: data.id,
        authId: data.auth_id,
        displayName: data.display_name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatar_url ?? null,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        loadProfile(data.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true)
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return { profile, loading }
}
