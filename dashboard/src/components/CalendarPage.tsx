"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCalendar, type CronJob } from "@/hooks/useCalendar"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function categoryColor(category: CronJob["category"]) {
  switch (category) {
    case "monitoring": return "bg-blue-400/20 text-blue-400 border-blue-400/20"
    case "sync":       return "bg-purple-400/20 text-purple-400 border-purple-400/20"
    case "pipeline":   return "bg-green-400/20 text-green-400 border-green-400/20"
    case "report":     return "bg-orange-400/20 text-orange-400 border-orange-400/20"
  }
}

function categoryDot(category: CronJob["category"]) {
  switch (category) {
    case "monitoring": return "bg-blue-400"
    case "sync":       return "bg-purple-400"
    case "pipeline":   return "bg-green-400"
    case "report":     return "bg-orange-400"
  }
}

function StatusIcon({ status }: { status: CronJob["status"] }) {
  if (status === "ok")      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
  if (status === "error")   return <AlertCircle  className="h-3.5 w-3.5 text-red-400" />
  return <Circle className="h-3.5 w-3.5 text-white/30" />
}

function formatScheduleLabel(job: CronJob): string {
  if (job.scheduleKind === "every" && job.everyMs) {
    const mins = job.everyMs / 60000
    if (mins < 60) return `every ${mins}m`
    return `every ${mins / 60}h`
  }
  return job.schedule
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTimeUntil(iso?: string): string {
  if (!iso) return "—"
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return "overdue"
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "< 1m"
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `in ${hrs}h`
  return `in ${Math.floor(hrs / 24)}d`
}

function JobDetailPanel({ job, onClose }: { job: CronJob; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-black/95 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("h-3 w-3 rounded-full shrink-0", categoryDot(job.category))} />
            <h3 className="text-base font-semibold text-white leading-snug">{job.name}</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Schedule"   value={formatScheduleLabel(job)} />
          <Row label="Status"     value={<div className="flex items-center gap-1.5"><StatusIcon status={job.status} /><span className={job.status === "ok" ? "text-green-400" : job.status === "error" ? "text-red-400" : "text-white/40"}>{job.status}</span></div>} />
          <Row label="Source"     value={<Badge variant={job.source === "openclaw" ? "default" : "outline"} className="text-xs">{job.source}</Badge>} />
          <Row label="Category"   value={<Badge className={cn("text-xs border", categoryColor(job.category))}>{job.category}</Badge>} />
          {job.lastRunAt  && <Row label="Last run"  value={`${formatRelativeTime(job.lastRunAt)} (${new Date(job.lastRunAt).toLocaleTimeString()})`} />}
          {job.nextRunAt  && <Row label="Next run"  value={`${formatTimeUntil(job.nextRunAt)} (${new Date(job.nextRunAt).toLocaleTimeString()})`} />}
          {job.lastDurationMs !== undefined && (
            <Row label="Duration" value={`${(job.lastDurationMs / 1000).toFixed(1)}s`} />
          )}
          {(job.consecutiveErrors ?? 0) > 0 && (
            <Row label="Errors" value={<span className="text-red-400">{job.consecutiveErrors} consecutive</span>} />
          )}
          {job.timezone && <Row label="Timezone" value={job.timezone} />}
          {job.cronExpr  && <Row label="Cron expr" value={<code className="text-purple-300 font-mono text-xs">{job.cronExpr}</code>} />}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="text-white/80 text-right">{value}</span>
    </div>
  )
}

function CalendarDay({
  date,
  jobs,
  isToday,
  isSelected,
  onClick,
}: {
  date: Date | null
  jobs: CronJob[]
  isToday: boolean
  isSelected: boolean
  onClick: () => void
}) {
  if (!date) {
    return <div className="aspect-square rounded-lg" />
  }

  // Group dots by category
  const categories = [...new Set(jobs.map((j) => j.category))]
  const hasError = jobs.some((j) => j.status === "error")

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-lg border text-left p-1.5 transition-all duration-150 flex flex-col",
        isSelected
          ? "border-purple-400/50 bg-purple-400/10"
          : isToday
          ? "border-blue-400/30 bg-blue-400/5 hover:border-blue-400/50"
          : "border-white/5 hover:border-white/15 hover:bg-white/5"
      )}
    >
      <span
        className={cn(
          "text-xs font-medium leading-none",
          isToday ? "text-blue-400" : isSelected ? "text-purple-300" : "text-white/60"
        )}
      >
        {date.getDate()}
      </span>

      {jobs.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-0.5 pt-1">
          {categories.map((cat) => (
            <span key={cat} className={cn("h-1.5 w-1.5 rounded-full", categoryDot(cat))} />
          ))}
          {hasError && (
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          )}
        </div>
      )}
    </button>
  )
}

function JobListItem({ job, isSelected, onClick }: { job: CronJob; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all duration-150",
        isSelected
          ? "border-purple-400/30 bg-purple-400/10"
          : "border-white/5 hover:border-white/15 hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", categoryDot(job.category))} />
          <span className="text-sm font-medium text-white/80 truncate">{job.name}</span>
        </div>
        <StatusIcon status={job.status} />
      </div>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Clock className="h-3 w-3 shrink-0" />
        <span className="truncate">{formatScheduleLabel(job)}</span>
        {job.nextRunAt && (
          <>
            <span>·</span>
            <span className="shrink-0">{formatTimeUntil(job.nextRunAt)}</span>
          </>
        )}
      </div>
    </button>
  )
}

function SkeletonCalendar() {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DAY_NAMES.map((d) => (
        <div key={d} className="py-2 text-center text-xs font-medium text-white/30">{d}</div>
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-lg border border-white/5 bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}

export default function CalendarPage() {
  const {
    jobs,
    loading,
    error,
    usedFallback,
    currentMonth,
    selectedJob,
    selectedDate,
    setSelectedJob,
    setSelectedDate,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    getCalendarDays,
    getJobsForDay,
    refresh,
  } = useCalendar()

  const [activeTab, setActiveTab] = useState<"all" | "monitoring" | "sync" | "pipeline" | "report">("all")

  const today = new Date()
  const calendarDays = getCalendarDays()

  const isToday = (date: Date | null) =>
    date !== null &&
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const isSelected = (date: Date | null) =>
    date !== null &&
    selectedDate !== null &&
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear()

  const filteredJobs = activeTab === "all" ? jobs : jobs.filter((j) => j.category === activeTab)

  const categoryTabs: { id: typeof activeTab; label: string; color: string }[] = [
    { id: "all",        label: "All",        color: "text-white/60" },
    { id: "monitoring", label: "Monitoring", color: "text-blue-400" },
    { id: "sync",       label: "Sync",       color: "text-purple-400" },
    { id: "pipeline",   label: "Pipeline",   color: "text-green-400" },
    { id: "report",     label: "Reports",    color: "text-orange-400" },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-0">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
            <Calendar className="h-4.5 w-4.5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Calendar</h1>
            <p className="text-xs text-white/40">Scheduled jobs & cron tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usedFallback && (
            <span className="text-xs text-orange-400/70 bg-orange-400/10 px-2 py-1 rounded-md">
              showing cached data
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
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

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          {/* Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/70 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-semibold text-white min-w-40 text-center">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/70 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Today
            </Button>
          </div>

          {/* Day Names */}
          <div className="mb-1 grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-white/30">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <SkeletonCalendar />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((date, i) => (
                <CalendarDay
                  key={i}
                  date={date}
                  jobs={date ? getJobsForDay(date) : []}
                  isToday={isToday(date)}
                  isSelected={isSelected(date)}
                  onClick={() => date && setSelectedDate(date)}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-white/30">
            <span>Legend:</span>
            {(["monitoring", "sync", "pipeline", "report"] as const).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", categoryDot(cat))} />
                <span className="capitalize">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel: Job List */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/70">
              Cron Jobs
              <span className="ml-2 text-xs text-white/30">({jobs.length})</span>
            </h3>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 flex-wrap">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white/10 " + tab.color
                    : "text-white/30 hover:text-white/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Job list */}
          <div className="flex-1 space-y-2 overflow-y-auto min-h-0 max-h-[calc(100vh-20rem)] pr-1">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
              ))
            ) : filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/30">No jobs in this category</div>
            ) : (
              filteredJobs.map((job) => (
                <JobListItem
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                />
              ))
            )}
          </div>

          {/* Summary stats */}
          {!loading && jobs.length > 0 && (
            <div className="mt-auto rounded-lg border border-white/5 bg-white/5 p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">{jobs.length}</div>
                  <div className="text-xs text-white/30">Total</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-400">
                    {jobs.filter((j) => j.status === "ok").length}
                  </div>
                  <div className="text-xs text-white/30">Healthy</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-400">
                    {jobs.filter((j) => j.status === "error").length}
                  </div>
                  <div className="text-xs text-white/30">Errors</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  )
}
