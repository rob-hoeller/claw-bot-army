"use client"

import { useState, useEffect, useRef } from "react"
import {
  Brain,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Filter,
  X,
  RefreshCw,
  FileText,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useMemories, type MemoryEntry } from "@/hooks/useMemories"

// ─── Markdown renderer (minimal, no external deps) ───────────────────────────

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
      // code block
      const lang = line.slice(3).trim()
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

function inlineFormat(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white/80">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="font-mono text-xs text-purple-300 bg-purple-400/10 px-1 rounded">{part.slice(1, -1)}</code>
    }
    return part
  })
}

// ─── Agent badge ─────────────────────────────────────────────────────────────

function AgentBadge({ agentId }: { agentId: string | null }) {
  const label = agentId || "unknown"
  const isFile = label === "file-system"
  const isMain = label === "main"

  return (
    <Badge
      className={cn(
        "text-xs font-mono",
        isFile ? "bg-orange-400/10 text-orange-300 border-orange-400/20" :
        isMain ? "bg-blue-400/10 text-blue-300 border-blue-400/20" :
                 "bg-purple-400/10 text-purple-300 border-purple-400/20"
      )}
    >
      {label}
    </Badge>
  )
}

// ─── Memory Entry Card ────────────────────────────────────────────────────────

function MemoryEntryCard({ entry }: { entry: MemoryEntry }) {
  const [expanded, setExpanded] = useState(true)
  const ts = entry.timestamp ? new Date(entry.timestamp) : null
  const timeStr = ts
    ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  const isLong = entry.content.length > 500

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5",
          isLong && "cursor-pointer hover:bg-white/5"
        )}
        onClick={() => isLong && setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          <AgentBadge agentId={entry.agent_id} />
          {timeStr && (
            <span className="text-xs text-white/30 font-mono">{timeStr}</span>
          )}
          <span className="text-xs text-white/20">{entry.source}</span>
        </div>
        {isLong && (
          <button className="text-white/30 hover:text-white/50 transition-colors">
            {expanded ? <ChevronLeft className="h-3.5 w-3.5 rotate-90" /> : <ChevronRight className="h-3.5 w-3.5 -rotate-90" />}
          </button>
        )}
      </div>
      {(!isLong || expanded) && (
        <div className="px-4 pb-4">
          {renderMarkdown(entry.content)}
        </div>
      )}
    </div>
  )
}

// ─── Date sidebar ─────────────────────────────────────────────────────────────

function DateSidebar({
  datesWithMemory,
  selectedDate,
  onSelect,
}: {
  datesWithMemory: string[]
  selectedDate: string | null
  onSelect: (date: string | null) => void
}) {
  // Group dates by month
  const byMonth: Record<string, string[]> = {}
  for (const d of datesWithMemory) {
    const month = d.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(d)
  }

  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

  function monthLabel(ym: string) {
    const [y, m] = ym.split("-")
    const date = new Date(parseInt(y), parseInt(m) - 1, 1)
    return date.toLocaleDateString([], { month: "long", year: "numeric" })
  }

  function dayLabel(d: string) {
    const date = new Date(d + "T12:00:00")
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-left text-sm transition-all",
          selectedDate === null
            ? "bg-purple-400/15 text-purple-300"
            : "text-white/40 hover:bg-white/5 hover:text-white/70"
        )}
      >
        All entries
      </button>

      {sortedMonths.map((month) => (
        <div key={month}>
          <div className="px-3 py-1.5 text-xs font-medium text-white/25 uppercase tracking-wider">
            {monthLabel(month)}
          </div>
          {byMonth[month]
            .sort((a, b) => b.localeCompare(a))
            .map((d) => (
              <button
                key={d}
                onClick={() => onSelect(d)}
                className={cn(
                  "w-full rounded-lg px-3 py-1.5 text-left text-sm transition-all flex items-center gap-2",
                  selectedDate === d
                    ? "bg-purple-400/15 text-purple-300"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400/60 shrink-0" />
                <span className="text-xs">{dayLabel(d)}</span>
              </button>
            ))}
        </div>
      ))}

      {datesWithMemory.length === 0 && (
        <div className="px-3 py-4 text-xs text-white/25 text-center">No memories found</div>
      )}
    </div>
  )
}

// ─── Long-term Memory Panel ───────────────────────────────────────────────────

function LongTermMemoryPanel({
  content,
  loading,
  onLoad,
}: {
  content: string | null
  loading: boolean
  onLoad: () => void
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (show && content === null && !loading) {
      onLoad()
    }
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
        onClick={() => setShow((s) => !s)}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white/80">Long-term Memory</span>
          <span className="text-xs text-white/30">MEMORY.md</span>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-white/30 transition-transform", show && "rotate-90")} />
      </button>

      {show && (
        <div className="border-t border-white/8 px-4 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : content ? (
            <div className="max-h-96 overflow-y-auto pr-1">
              {renderMarkdown(content)}
            </div>
          ) : (
            <p className="text-sm text-white/30 italic">MEMORY.md not found</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemoryBrowserPage() {
  const {
    days,
    datesWithMemory,
    agents,
    loading,
    error,
    totalEntries,
    selectedDate,
    searchQuery,
    agentFilter,
    selectedDayEntries,
    longTermMemory,
    longTermLoading,
    selectDate,
    setSearch,
    setAgent,
    fetchLongTermMemory,
    refresh,
  } = useMemories()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  const hasFilters = !!searchQuery || !!agentFilter || !!selectedDate

  function clearFilters() {
    setSearch("")
    setAgent(null)
    selectDate(null)
  }

  const displayEntries = selectedDayEntries
  const selectedDayLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : `All memories (${totalEntries})`

  return (
    <div className="flex h-full flex-col gap-0 min-h-0">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
            <Brain className="h-4.5 w-4.5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Memories</h1>
            <p className="text-xs text-white/40">Agent journal & daily logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-white/50 hover:text-white/80 hidden md:flex"
            title="Toggle date sidebar"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={loading}
            className="text-white/50 hover:text-white/80"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Agent filter */}
        {agents.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-white/30" />
            <select
              value={agentFilter || ""}
              onChange={(e) => setAgent(e.target.value || null)}
              className="bg-white/5 border border-white/10 text-white/60 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400/40"
            >
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Date Sidebar */}
        {sidebarOpen && (
          <div className="w-52 shrink-0 overflow-y-auto border-r border-white/5 pr-3 pb-4 hidden md:block">
            <DateSidebar
              datesWithMemory={datesWithMemory}
              selectedDate={selectedDate}
              onSelect={selectDate}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto pb-4">
          {/* Day header */}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-white/30" />
            <h2 className="text-sm font-medium text-white/60">{selectedDayLabel}</h2>
            {displayEntries.length > 0 && (
              <span className="text-xs text-white/25">· {displayEntries.length} {displayEntries.length === 1 ? "entry" : "entries"}</span>
            )}
          </div>

          {/* Entries */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-white/5 animate-pulse" style={{ height: 120 + i * 40 }} />
              ))}
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Brain className="h-10 w-10 text-white/10" />
              <p className="text-sm text-white/30">
                {hasFilters ? "No memories match your filters" : "No memories found for this date"}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayEntries.map((entry) => (
                <MemoryEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {/* Long-term memory */}
          <LongTermMemoryPanel
            content={longTermMemory}
            loading={longTermLoading}
            onLoad={fetchLongTermMemory}
          />
        </div>
      </div>
    </div>
  )
}
