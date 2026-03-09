"use client"

import { useState, useEffect, useCallback } from "react"
import type { CronJob } from "@/app/api/cron/route"

export type { CronJob }

export interface CalendarState {
  jobs: CronJob[]
  loading: boolean
  error: string | null
  usedFallback: boolean
  currentMonth: Date
  selectedJob: CronJob | null
  selectedDate: Date | null
}

export function useCalendar() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/cron")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setJobs(data.jobs || [])
      setUsedFallback(data.usedFallback || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cron jobs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const goToToday = useCallback(() => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(new Date())
  }, [])

  // Get all calendar days for the current month view (including padding days)
  const getCalendarDays = useCallback((): (Date | null)[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: (Date | null)[] = []
    // Padding at start
    for (let i = 0; i < firstDay; i++) days.push(null)
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    // Padding at end (fill to complete grid rows)
    while (days.length % 7 !== 0) days.push(null)

    return days
  }, [currentMonth])

  // All jobs run every day (sub-daily or daily), so every day gets all jobs
  // But we can filter by whether a cron job would run on a specific day of week, etc.
  // For simplicity, all jobs appear on all days
  const getJobsForDay = useCallback(
    (_date: Date): CronJob[] => {
      return jobs
    },
    [jobs]
  )

  return {
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
    refresh: fetchJobs,
  }
}
