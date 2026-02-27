"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { MonitoringPage } from "./MonitoringPage"
import { TokenUsagePage } from "./TokenUsagePage"

type TabId = "health" | "usage"

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  description: string
}

export function PlatformPage() {
  const [activeTab, setActiveTab] = useState<TabId>("health")

  // Tab definitions
  const tabs: Tab[] = [
    { 
      id: "health", 
      label: "Health", 
      icon: Activity, 
      description: "System health & monitoring" 
    },
    { 
      id: "usage", 
      label: "Usage & Costs", 
      icon: Coins, 
      description: "Token usage & cost tracking" 
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-white">Platform</h1>
        <p className="text-sm text-white/50 mt-1">Monitor system health, usage, and costs</p>
      </motion.div>

      {/* Tab bar — custom styled, not using ui/tabs */}
      <motion.div 
        className="flex items-center gap-1 border-b border-white/10 pb-px"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200",
                isActive
                  ? "bg-white/5 text-white border-b-2 border-purple-400 -mb-[2px]"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </motion.div>

      {/* Tab content with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "health" && <MonitoringPage />}
          {activeTab === "usage" && <TokenUsagePage />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
