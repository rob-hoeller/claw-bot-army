"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export type AgentStatus = 'idle' | 'processing' | 'typing' | 'offline'

interface AgentStatusBadgeProps {
  status: AgentStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<AgentStatus, {
  color: string
  bgColor: string
  pulseColor: string
  label: string
}> = {
  idle: {
    color: 'bg-green-500',
    bgColor: 'bg-green-500/20',
    pulseColor: 'bg-green-400',
    label: 'Idle'
  },
  processing: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/20',
    pulseColor: 'bg-blue-400',
    label: 'Processing'
  },
  typing: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/20',
    pulseColor: 'bg-yellow-400',
    label: 'Typing'
  },
  offline: {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/20',
    pulseColor: 'bg-red-400',
    label: 'Offline'
  }
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    container: 'gap-1',
    text: 'text-[10px]'
  },
  md: {
    dot: 'w-2.5 h-2.5',
    container: 'gap-1.5',
    text: 'text-xs'
  },
  lg: {
    dot: 'w-3 h-3',
    container: 'gap-2',
    text: 'text-sm'
  }
}

export function AgentStatusBadge({ 
  status, 
  showLabel = false, 
  size = 'md',
  className 
}: AgentStatusBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const isActive = status === 'processing' || status === 'typing'

  return (
    <div className={cn("flex items-center", sizes.container, className)}>
      <div className="relative">
        {/* Pulse animation for active states */}
        {isActive && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              config.pulseColor
            )}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
        
        {/* Main dot */}
        <motion.div
          className={cn(
            "rounded-full relative z-10",
            config.color,
            sizes.dot
          )}
          animate={isActive ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={isActive ? {
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span className={cn(
          "text-white/60 font-medium",
          sizes.text
        )}>
          {config.label}
        </span>
      )}
    </div>
  )
}

// Hook to get agent status (would integrate with gateway)
export function useAgentStatus(agentId: string): AgentStatus {
  // TODO: Integrate with gateway sessions API
  // For now, return demo status based on agent ID
  const demoStatuses: Record<string, AgentStatus> = {
    'hbx': 'idle',
    'cx-1': 'processing',
    'cx-2': 'idle',
    'cx-3': 'typing',
    'cx-4': 'idle',
    'cx-5': 'offline',
    'cx-6': 'idle',
  }
  
  return demoStatuses[agentId] || 'idle'
}
