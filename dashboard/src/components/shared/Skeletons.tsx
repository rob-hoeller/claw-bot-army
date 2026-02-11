"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white/5",
        className
      )}
    />
  )
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />
}

export function SkeletonTitle({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-48", className)} />
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />
}

export function SkeletonButton({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-9 w-24 rounded-lg", className)} />
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <SkeletonAvatar />
        <div className="space-y-2 flex-1">
          <SkeletonText className="w-32" />
          <SkeletonText className="w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonText />
        <SkeletonText className="w-3/4" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/5">
        <SkeletonText className="w-32" />
        <SkeletonText className="w-48" />
        <SkeletonText className="w-24" />
        <SkeletonText className="w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <SkeletonText className="w-32" />
          <SkeletonText className="w-48" />
          <SkeletonText className="w-24" />
          <SkeletonText className="w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonTitle />
          <SkeletonText className="w-64" />
        </div>
        <SkeletonButton />
      </div>
      {/* Content */}
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
