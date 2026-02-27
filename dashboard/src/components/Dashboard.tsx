"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Rocket,
  ArrowRight,
} from "lucide-react"
import PageHeader from "@/components/PageHeader"
import { useRealtimeFeatures } from "@/hooks/useRealtimeFeatures"

interface DashboardProps {
  onNavigate?: (page: string) => void
}

export default function Dashboard({ onNavigate }: DashboardProps = {}) {
  const { features, justMoved, isLoading } = useRealtimeFeatures()
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>(undefined)

  // Calculate Mission Control metrics
  const activeMissions = features.filter(
    (f) => f.current_agent && f.status !== "done" && f.status !== "cancelled"
  ).length
  
  const needsAttention = features.filter(
    // @ts-ignore - needs_attention may not be in type yet
    (f) => f.needs_attention === true
  ).length

  const agentsOnline = 3 // TODO: Get from actual agent status

  const completedFeatures = features
    .filter((f) => f.status === "done")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId)
    // TODO: Add navigation to feature detail or open a modal
    console.log("Selected feature:", featureId)
  }

  return (
    <div>
      <PageHeader
        title="Command Center"
        description="Overview of the HBx Agent Network"
      />

      {/* Quick Stats - 3 Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigate?.("mission-control")}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Rocket className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {activeMissions}
          </p>
          <p className="text-sm text-white/60">Active Missions</p>
          <p className="text-xs text-white/40 mt-1">Features in progress</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          onClick={() => onNavigate?.("mission-control")}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="rounded-lg bg-yellow-500/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {needsAttention}
          </p>
          <p className="text-sm text-white/60">Needs Attention</p>
          <p className="text-xs text-white/40 mt-1">Requires review</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          onClick={() => onNavigate?.("agents")}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="rounded-lg bg-green-500/10 p-2.5">
              <Bot className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {agentsOnline}
          </p>
          <p className="text-sm text-white/60">Agents Online</p>
          <p className="text-xs text-white/40 mt-1">Currently active</p>
        </motion.button>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <h3 className="text-sm font-medium text-white/60 mb-4">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("mission-control")}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all text-left"
              >
                <div className="rounded-lg bg-blue-500/20 p-3 group-hover:bg-blue-500/30 transition-colors">
                  <Rocket className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Open Mission Control</p>
                  <p className="text-xs text-white/40 mt-0.5">View pipeline</p>
                </div>
              </button>

              <button
                onClick={() => onNavigate("agents")}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left"
              >
                <div className="rounded-lg bg-purple-500/20 p-3 group-hover:bg-purple-500/30 transition-colors">
                  <Bot className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">View Agents</p>
                  <p className="text-xs text-white/40 mt-0.5">Manage network</p>
                </div>
              </button>

              <button
                onClick={() => onNavigate("platform")}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left"
              >
                <div className="rounded-lg bg-green-500/20 p-3 group-hover:bg-green-500/30 transition-colors">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Platform Health</p>
                  <p className="text-xs text-white/40 mt-0.5">Check status</p>
                </div>
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-sm font-medium text-white/60 mb-4">Recent Completions</h3>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
          {completedFeatures.length > 0 ? (
            completedFeatures.map((feature) => (
              <div key={feature.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{feature.title}</p>
                    <p className="text-xs text-white/40 mt-1">
                      Completed {new Date(feature.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  {feature.pr_url && (
                    <a
                      href={feature.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                    >
                      PR
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">No completed features yet</p>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  )
}
