"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBannerProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  onDismiss,
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10",
        className
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 shrink-0">
        <AlertCircle className="h-4 w-4 text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-red-300">{title}</h4>
        <p className="text-sm text-red-200/70 mt-0.5">{message}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Try again
          </Button>
        )}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-6 w-6 text-red-300/50 hover:text-red-300 hover:bg-red-500/20 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
