"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type DocCategory =
  | "knowledge-base"
  | "feature-spec"
  | "design-spec"
  | "build-report"
  | "other"

export interface Doc {
  id: string
  title: string
  content: string
  category: DocCategory
  slug?: string
  version?: number
  updatedBy?: string
  createdAt: string
  updatedAt: string
  /** For handoff packets: feature id */
  featureId?: string
  /** Source table */
  source: "global_knowledge" | "handoff_packet" | "feature"
}

function handoffPhaseToCategory(phase: string): DocCategory {
  if (phase === "spec") return "feature-spec"
  if (phase === "design") return "design-spec"
  if (phase === "build" || phase === "review") return "build-report"
  return "other"
}

function handoffTitle(phase: string, summary: string): string {
  const label =
    phase === "spec"
      ? "Feature Spec"
      : phase === "design"
      ? "Design Spec"
      : phase === "build"
      ? "Build Report"
      : phase === "review"
      ? "Review Report"
      : phase.charAt(0).toUpperCase() + phase.slice(1)
  const snippet = summary ? ` — ${summary.slice(0, 60)}` : ""
  return `${label}${snippet}`
}

export function useDocs() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    if (!supabase) {
      setDocs([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. global_knowledge
      const { data: gk, error: gkErr } = await supabase
        .from("global_knowledge")
        .select("id, slug, title, content, category, version, updated_by, created_at, updated_at")
        .order("updated_at", { ascending: false })

      if (gkErr) console.warn("[useDocs] global_knowledge:", gkErr.message)

      // 2. handoff_packets
      const { data: hp, error: hpErr } = await supabase
        .from("handoff_packets")
        .select("id, feature_id, phase, output_summary, output_artifacts, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (hpErr) console.warn("[useDocs] handoff_packets:", hpErr.message)

      // 3. features (feature_spec + design_spec)
      const { data: features, error: featErr } = await supabase
        .from("features")
        .select("id, title, feature_spec, design_spec, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200)

      if (featErr) console.warn("[useDocs] features:", featErr.message)

      const normalized: Doc[] = []

      // Map global_knowledge
      for (const r of gk ?? []) {
        const cat: DocCategory =
          r.category === "knowledge-base" ||
          r.category === "feature-spec" ||
          r.category === "design-spec" ||
          r.category === "build-report"
            ? (r.category as DocCategory)
            : "knowledge-base"
        normalized.push({
          id: `gk-${r.id}`,
          title: r.title || r.slug || "Untitled",
          content: r.content || "",
          category: cat,
          slug: r.slug,
          version: r.version,
          updatedBy: r.updated_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
          source: "global_knowledge",
        })
      }

      // Map handoff_packets
      for (const r of hp ?? []) {
        const content =
          r.output_artifacts
            ? typeof r.output_artifacts === "string"
              ? r.output_artifacts
              : JSON.stringify(r.output_artifacts, null, 2)
            : r.output_summary || ""
        normalized.push({
          id: `hp-${r.id}`,
          title: handoffTitle(r.phase || "handoff", r.output_summary || ""),
          content,
          category: handoffPhaseToCategory(r.phase || ""),
          createdAt: r.created_at,
          updatedAt: r.created_at,
          featureId: r.feature_id,
          source: "handoff_packet",
        })
      }

      // Map features — feature_spec
      for (const r of features ?? []) {
        if (r.feature_spec) {
          normalized.push({
            id: `feat-spec-${r.id}`,
            title: `${r.title || "Untitled"} — Feature Spec`,
            content: typeof r.feature_spec === "string" ? r.feature_spec : JSON.stringify(r.feature_spec, null, 2),
            category: "feature-spec",
            createdAt: r.created_at,
            updatedAt: r.updated_at || r.created_at,
            featureId: r.id,
            source: "feature",
          })
        }
        if (r.design_spec) {
          normalized.push({
            id: `feat-design-${r.id}`,
            title: `${r.title || "Untitled"} — Design Spec`,
            content: typeof r.design_spec === "string" ? r.design_spec : JSON.stringify(r.design_spec, null, 2),
            category: "design-spec",
            createdAt: r.created_at,
            updatedAt: r.updated_at || r.created_at,
            featureId: r.id,
            source: "feature",
          })
        }
      }

      setDocs(normalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load docs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  // Save doc (only global_knowledge is editable)
  const saveDoc = useCallback(
    async (doc: Doc, newContent: string): Promise<void> => {
      if (!supabase) throw new Error("Not configured")
      if (doc.source !== "global_knowledge") throw new Error("Only knowledge base docs can be edited here")

      const rawId = doc.id.replace("gk-", "")
      const { error } = await supabase
        .from("global_knowledge")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", rawId)
      if (error) throw error

      setDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, content: newContent, updatedAt: new Date().toISOString() } : d
        )
      )
    },
    []
  )

  // Create new doc in global_knowledge
  const createDoc = useCallback(
    async (title: string, category: DocCategory, content: string): Promise<void> => {
      if (!supabase) throw new Error("Not configured")

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      const { data, error } = await supabase
        .from("global_knowledge")
        .insert({
          slug,
          title,
          content,
          category,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      const newDoc: Doc = {
        id: `gk-${data.id}`,
        title: data.title,
        content: data.content || "",
        category,
        slug: data.slug,
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        source: "global_knowledge",
      }
      setDocs((prev) => [newDoc, ...prev])
    },
    []
  )

  return { docs, loading, error, refresh: fetchDocs, saveDoc, createDoc }
}
