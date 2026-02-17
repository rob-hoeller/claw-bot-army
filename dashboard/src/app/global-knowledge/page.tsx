"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Plus, ArrowLeft, Save, Eye, Edit3, Clock, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorBanner } from "@/components/shared/ErrorBanner"
import { SkeletonCard } from "@/components/shared/Skeletons"
import ReactMarkdown from "react-markdown"

interface KnowledgeDoc {
  id: string
  slug: string
  title: string
  content?: string
  category: string | null
  version: number
  updated_by: string | null
  updated_at: string
}

export default function GlobalKnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<KnowledgeDoc | null>(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newTitle, setNewTitle] = useState("")

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/global-knowledge")
      if (!res.ok) throw new Error("Failed to fetch documents")
      const data = await res.json()
      setDocs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDoc = async (slug: string) => {
    try {
      const res = await fetch(`/api/global-knowledge/${slug}`)
      if (!res.ok) throw new Error("Failed to fetch document")
      const data = await res.json()
      setSelected(data)
      setEditContent(data.content || "")
      setEditTitle(data.title || "")
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    }
  }

  const saveDoc = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/global-knowledge/${selected.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          updated_by: "dashboard-user",
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      setSelected(data)
      setEditing(false)
      fetchDocs()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  const createDoc = async () => {
    if (!newSlug || !newTitle) return
    setSaving(true)
    try {
      const res = await fetch("/api/global-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          title: newTitle,
          content: `# ${newTitle}\n\nNew document.`,
          updated_by: "dashboard-user",
        }),
      })
      if (!res.ok) throw new Error("Failed to create")
      setCreating(false)
      setNewSlug("")
      setNewTitle("")
      fetchDocs()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  // Detail view
  if (selected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Knowledge Base
            </button>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-white/50 border-white/10">
                <Hash className="h-3 w-3 mr-1" />
                v{selected.version}
              </Badge>
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <Eye className="h-4 w-4 mr-1" /> Preview
                  </Button>
                  <Button size="sm" onClick={saveDoc} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Title */}
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold bg-white/5 border-white/10 text-white mb-4 h-12"
            />
          ) : (
            <h1 className="text-2xl font-bold mb-4">{selected.title}</h1>
          )}

          <div className="text-xs text-white/40 mb-6 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(selected.updated_at).toLocaleDateString()}
            </span>
            {selected.updated_by && <span>by {selected.updated_by}</span>}
          </div>

          {/* Content */}
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[600px] bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/90 font-mono resize-y focus:outline-none focus:border-white/20"
              placeholder="Write markdown content..."
            />
          ) : (
            <Card className="bg-white/[0.02] border-white/10 p-6">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{selected.content || ""}</ReactMarkdown>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Global Knowledge Base</h1>
            <p className="text-sm text-white/50 mt-1">
              Shared documentation accessible to all agents
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4 mr-1" />
            New Document
          </Button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchDocs} className="mb-4" />}

        {/* Create form */}
        {creating && (
          <Card className="bg-white/[0.02] border-white/10 p-4 mb-6">
            <div className="flex gap-3">
              <Input
                placeholder="slug (e.g. my-doc)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button onClick={createDoc} disabled={saving || !newSlug || !newTitle}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create your first knowledge base document."
            action={{ label: "Create Document", onClick: () => setCreating(true) }}
          />
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => openDoc(doc.slug)}
                className="w-full text-left"
              >
                <Card className="bg-white/[0.02] border-white/10 p-4 hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
                        <FileText className="h-4 w-4 text-white/40" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{doc.title}</div>
                        <div className="text-xs text-white/40 mt-0.5">
                          /{doc.slug}
                          {doc.category && (
                            <span className="ml-2 text-white/30">• {doc.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>v{doc.version}</span>
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
