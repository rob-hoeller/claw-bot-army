"use client"

import { useState, useEffect, useCallback } from "react"

interface HashState {
  page: string
  itemId: string | null
}

function parseHash(hash: string): HashState {
  // Format: #page?item=id
  const cleaned = hash.replace(/^#/, "")
  if (!cleaned) return { page: "dashboard", itemId: null }

  const [page, query] = cleaned.split("?")
  let itemId: string | null = null

  if (query) {
    const params = new URLSearchParams(query)
    itemId = params.get("item")
  }

  return { page: page || "dashboard", itemId }
}

function buildHash(page: string, itemId?: string | null): string {
  if (page === "dashboard" && !itemId) return ""
  let hash = `#${page}`
  if (itemId) hash += `?item=${itemId}`
  return hash
}

export function useHashRouter(defaultPage = "dashboard") {
  const [state, setState] = useState<HashState>(() => {
    if (typeof window === "undefined") return { page: defaultPage, itemId: null }
    return parseHash(window.location.hash)
  })

  // Listen for hash changes (back/forward)
  useEffect(() => {
    const handler = () => {
      setState(parseHash(window.location.hash))
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])

  const navigate = useCallback((page: string, itemId?: string | null) => {
    const hash = buildHash(page, itemId)
    if (hash) {
      window.location.hash = hash
    } else {
      // Remove hash cleanly
      history.pushState(null, "", window.location.pathname + window.location.search)
      setState({ page, itemId: null })
    }
  }, [])

  const setItemId = useCallback((itemId: string | null) => {
    const hash = buildHash(state.page, itemId)
    if (hash) {
      window.location.hash = hash
    } else {
      history.pushState(null, "", window.location.pathname + window.location.search)
      setState(prev => ({ ...prev, itemId: null }))
    }
  }, [state.page])

  return {
    page: state.page,
    itemId: state.itemId,
    navigate,
    setItemId,
  }
}
