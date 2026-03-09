"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Search,
  Plus,
  X,
  Save,
  Pencil,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  ChevronDown,
  BookOpen,
  Loader2,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useDocs, type Doc, type DocCategory } from "@/hooks/useDocs"

// ─── Markdown renderer ───────────────────────────────────────────────────────

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white/80">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1 py-0.5 rounded bg-white/10 text-purple-300 font-mono text-xs">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={i} className="text-sm font-semibold text-white/80 mt-3 mb-1">{line.slice(4)}</h3>)
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={i} className="text-base font-semibold text-white mt-4 mb-1.5">{line.slice(3)}</h2>)
    } else if (line.startsWith("# ")) {
      nodes.push(<h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>)
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <li key={i} className="text-sm text-white/60 leading-relaxed ml-3 list-none before:content-['·'] before:mr-2 before:text-white/30">
          {inlineFormat(line.slice(2))}
        </li>
      )
    } else if (line.startsWith("```")) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push(
        <pre key={i} className="my-2 rounded-md bg-white/5 border border-white/10 p-3 overflow-x-auto">
          <code className="text-xs text-green-300/80 font-mono whitespace-pre">{codeLines.join("\n")}</code>
        </pre>
      )
    } else if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />)
    } else if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} className="border-l-2 border-purple-400/40 pl-3 my-1 text-sm text-white/50 italic">
          {inlineFormat(line.slice(2))}
        </blockquote>
      )
    } else {
      nodes.push(<p key={i} className="text-sm text-white/60 leading-relaxed">{inlineFormat(line)}</p>)
    }
    i++
  }
  return nodes
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: { id: DocCategory | "all"; label: string; color: string }[] = [
  { id: "all", label: "All", color: "text-white/60" },
  { id: "knowledge-base", label: "Knowledge Base", color: "text-blue-400" },
  { id: "feature-spec", label: "Feature Specs", color: "text-purple-400" },
  { id: "design-spec", label: "Design Specs", color: "text-pink-400" },
  { id: "build-report", label: "Build Reports", color: "text-amber-400" },
  { id: "other", label: "Other", color: "text-white/40" },
]

function categoryLabel(cat: DocCategory): string {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat
}

function categoryColor(cat: DocCategory): string {
  const map: Record<DocCategory, string> = {
    "knowledge-base": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "feature-spec": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "design-spec": "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "build-report": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    other: "bg-white/5 text-white/40 border-white/10",
  }
  return map[cat] ?? map.other
}

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = "updatedAt" | "title" | "category"

// ─── Doc Card ────────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onClick,
  isSelected,
  viewMode,
}: {
  doc: Doc
  onClick: () => void
  isSelected: boolean
  viewMode: "list" | "grid"
}) {
  const snippet = doc.content.replace(/#+\s/g, "").replace(/\*\*/g, "").trim().slice(0, 120)
  const relTime = formatRelTime(doc.updatedAt)

  if (viewMode === "grid") {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={cn(
          "text-left p-4 rounded-xl border transition-all flex flex-col gap-2",
          isSelected
            ? "border-purple-500/50 bg-purple-500/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <FileText className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
          <Badge variant="outline" className={cn("text-[10px] border shrink-0", categoryColor(doc.category))}>
            {categoryLabel(doc.category)}
          </Badge>
        </div>
        <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{doc.title}</p>
        <p className="text-xs text-white/40 line-clamp-3 leading-relaxed">{snippet}</p>
        <p className="text-[10px] text-white/30 mt-auto">{relTime}</p>
      </motion.button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.998 }}
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-4",
        isSelected
          ? "border-purple-500/50 bg-purple-500/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <FileText className="h-4 w-4 text-white/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-white truncate">{doc.title}</p>
          <Badge variant="outline" className={cn("text-[10px] border shrink-0", categoryColor(doc.category))}>
            {categoryLabel(doc.category)}
          </Badge>
        </div>
        <p className="text-xs text-white/40 truncate">{snippet}</p>
      </div>
      <p className="text-[10px] text-white/30 shrink-0 whitespace-nowrap">{relTime}</p>
    </motion.button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DocSkeleton({ viewMode }: { viewMode: "list" | "grid" }) {
  if (viewMode === "grid") {
    return (
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3 animate-pulse">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-3 w-2/3 bg-white/5 rounded" />
      </div>
    )
  }
  return (
    <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-4 animate-pulse">
      <div className="h-4 w-4 bg-white/10 rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 bg-white/10 rounded" />
        <div className="h-2 w-3/4 bg-white/5 rounded" />
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DocDetailPanel({
  doc,
  onClose,
  onSave,
}: {
  doc: Doc
  onClose: () => void
  onSave: (doc: Doc, content: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const canEdit = doc.source === "global_knowledge"

  const handleEdit = () => {
    setEditContent(doc.content)
    setIsEditing(true)
    setSaveMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      await onSave(doc, editContent)
      setIsEditing(false)
      setSaveMsg({ type: "success", text: "Saved" })
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-2xl border-l border-white/10 bg-black/98 backdrop-blur-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 shrink-0">
            <BookOpen className="h-5 w-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{doc.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={cn("text-[10px] border", categoryColor(doc.category))}>
                {categoryLabel(doc.category)}
              </Badge>
              <span className="text-[10px] text-white/30">{formatRelTime(doc.updatedAt)}</span>
              {doc.version && (
                <span className="text-[10px] text-white/30">v{doc.version}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {saveMsg && (
            <span className={cn("text-xs mr-2", saveMsg.type === "success" ? "text-green-400" : "text-red-400")}>
              {saveMsg.text}
            </span>
          )}
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={handleEdit} className="h-8 text-xs text-white/60 hover:text-white">
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-xs text-white/40">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[500px] bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-purple-500/50"
          />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none space-y-0.5">
            {renderMarkdown(doc.content || "_No content_")}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── New Doc Panel ────────────────────────────────────────────────────────────

function NewDocPanel({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, category: DocCategory, content: string) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<DocCategory>("knowledge-base")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = title.trim().length > 0

  const handleCreate = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      await onCreate(title.trim(), category, content)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-2xl border-l border-white/10 bg-black/98 backdrop-blur-xl z-50 flex flex-col"
    >
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
            <Plus className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">New Document</h2>
            <p className="text-xs text-white/50">Saved to Knowledge Base</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <label className="text-xs text-white/60 mb-1.5 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="bg-white/5 border-white/10"
          />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1.5 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocCategory)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
          >
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1.5 block">Content (Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Document Title&#10;&#10;Write your content here..."
            rows={18}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-purple-500/50"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-shrink-0 border-t border-white/10 p-6">
        <Button className="w-full" disabled={!isValid || saving} onClick={handleCreate}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" />Create Document</>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { docs, loading, error, refresh, saveDoc, createDoc } = useDocs()

  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = docs

    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category === categoryFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      if (sortKey === "updatedAt") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (sortKey === "title") return a.title.localeCompare(b.title)
      if (sortKey === "category") return a.category.localeCompare(b.category)
      return 0
    })

    return result
  }, [docs, categoryFilter, search, sortKey])

  // Stats
  const stats = useMemo(() => {
    const byCategory = docs.reduce(
      (acc, d) => {
        acc[d.category] = (acc[d.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return { total: docs.length, byCategory }
  }, [docs])

  const sortLabel: Record<SortKey, string> = {
    updatedAt: "Date Updated",
    title: "Title",
    category: "Category",
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Docs</h1>
            <p className="text-sm text-white/40">
              {loading ? "Loading..." : `${stats.total} documents across all sources`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              className="h-9 w-9 text-white/40 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowNewDoc(true)}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Document
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && docs.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
              const count = stats.byCategory[cat.id] ?? 0
              if (count === 0) return null
              return (
                <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <span className={cn("text-xs font-medium", cat.color)}>{cat.label}</span>
                  <span className="text-xs text-white/30">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles & content..."
              className="pl-9 bg-white/5 border-white/10 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="h-9 text-xs text-white/60 hover:text-white gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              {sortLabel[sortKey]}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSortMenu && "rotate-180")} />
            </Button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-black/95 border border-white/10 rounded-xl p-1 min-w-[140px] z-20 shadow-xl">
                {(["updatedAt", "title", "category"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortKey(key); setShowSortMenu(false) }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs rounded-lg transition-all",
                      sortKey === key ? "bg-purple-500/20 text-purple-300" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {sortLabel[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = cat.id === "all" ? docs.length : (stats.byCategory[cat.id] ?? 0)
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as DocCategory | "all")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  categoryFilter === cat.id
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                )}
              >
                {cat.label}
                <span className={cn("text-[10px]", categoryFilter === cat.id ? "text-purple-400" : "text-white/20")}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Doc List / Grid */}
        {loading ? (
          <div className={cn("gap-3", viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col")}>
            {Array.from({ length: 8 }).map((_, i) => <DocSkeleton key={i} viewMode={viewMode} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-white/10 mb-4" />
            <p className="text-sm text-white/30">
              {search ? `No docs matching "${search}"` : "No documents in this category"}
            </p>
            {!search && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 text-xs text-white/40"
                onClick={() => setShowNewDoc(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create first document
              </Button>
            )}
          </div>
        ) : (
          <div className={cn("gap-3", viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col")}>
            {filtered.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onClick={() => setSelectedDoc(doc)}
                isSelected={selectedDoc?.id === doc.id}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedDoc(null)}
            />
            <DocDetailPanel
              doc={selectedDoc}
              onClose={() => setSelectedDoc(null)}
              onSave={async (doc, content) => {
                await saveDoc(doc, content)
                setSelectedDoc((prev) => prev ? { ...prev, content, updatedAt: new Date().toISOString() } : null)
              }}
            />
          </>
        )}
        {showNewDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowNewDoc(false)}
            />
            <NewDocPanel
              onClose={() => setShowNewDoc(false)}
              onCreate={createDoc}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
