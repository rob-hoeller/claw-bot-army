"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type DeploymentStatus = "active" | "deploying" | "standby" | "inactive"

interface DeploymentStatusBadgeProps {
  status: DeploymentStatus | null | undefined
  size?: "sm" | "md"
  className?: string
}

const STATUS_CONFIG: Record<string, { dot: string; text: string; label: string; pulse: boolean; pill: string }> = {
  active:    { dot: "bg-emerald-500", text: "text-emerald-400", label: "Active",    pulse: false, pill: "bg-emerald-500/10" },
  deploying: { dot: "bg-yellow-500",  text: "text-yellow-400",  label: "Deploying", pulse: true,  pill: "bg-yellow-500/10"  },
  standby:   { dot: "bg-zinc-500",    text: "text-zinc-400",    label: "Inactive",  pulse: false, pill: "bg-zinc-500/10"    },
  inactive:  { dot: "bg-zinc-500",    text: "text-zinc-400",    label: "Inactive",  pulse: false, pill: "bg-zinc-500/10"    },
}

const UNKNOWN_CONFIG = { dot: "bg-zinc-600", text: "text-zinc-500", label: "Unknown", pulse: false, pill: "bg-zinc-600/10" }

export function DeploymentStatusBadge({ status, size = "sm", className }: DeploymentStatusBadgeProps) {
  const config = (status && STATUS_CONFIG[status]) || UNKNOWN_CONFIG

  const isSm = size === "sm"

  return (
    <span
      role="status"
      aria-label={`Deployment status: ${config.label}`}
      className={cn(
        "inline-flex items-center",
        isSm ? "gap-1" : "gap-1.5 rounded-full px-2 py-0.5",
        !isSm && config.pill,
        className
      )}
    >
      <span className="relative flex items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            "rounded-full",
            isSm ? "w-1.5 h-1.5" : "w-2 h-2",
            config.dot
          )}
        />
        {config.pulse && (
          <motion.span
            aria-hidden="true"
            className={cn(
              "absolute rounded-full",
              isSm ? "w-1.5 h-1.5" : "w-2 h-2",
              config.dot
            )}
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </span>
      <span className={cn(isSm ? "text-[10px]" : "text-xs", "font-medium", config.text)}>
        {config.label}
      </span>
    </span>
  )
}

export type { DeploymentStatus, DeploymentStatusBadgeProps }
