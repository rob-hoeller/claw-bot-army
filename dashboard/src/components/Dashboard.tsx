"use client"

import { motion } from "framer-motion"
import {
  Users,
  Bot,
  Activity,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import CardSection from "@/components/CardSection"
import PageHeader from "@/components/PageHeader"

const stats = [
  {
    label: "Active Agents",
    value: "3",
    change: "+1 this week",
    icon: Bot,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Total Users",
    value: "3",
    change: "All admins",
    icon: Users,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    label: "Conversations",
    value: "—",
    change: "Coming soon",
    icon: MessageSquare,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Uptime",
    value: "99.9%",
    change: "Last 30 days",
    icon: Activity,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
]

const agents = [
  {
    id: "HBx",
    name: "Master Orchestrator",
    dept: "Platform",
    status: "active",
  },
  {
    id: "HBx_SL1",
    name: "Schellie",
    dept: "Sales",
    status: "active",
  },
  {
    id: "HBx_SL2",
    name: "Competitive Intel",
    dept: "Sales",
    status: "deploying",
  },
  {
    id: "HBx_SK1",
    name: "Skill Builder",
    dept: "Platform",
    status: "deploying",
  },
]

const recentActivity = [
  {
    action: "Platform initialized",
    time: "Just now",
    type: "success",
  },
  {
    action: "UI Redesign deployed",
    time: "In progress",
    type: "info",
  },
  {
    action: "Email OTP auth enabled",
    time: "1 hour ago",
    type: "success",
  },
]

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of the HBx Agent Network"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-lg ${stat.bgColor} p-2.5`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-white/20" />
              </div>
              <p className="text-2xl font-semibold text-white mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-white/40">{stat.change}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Status */}
        <CardSection
          title="Agent Network"
          description="Status of all registered agents"
        >
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{agent.id}</p>
                    <p className="text-xs text-white/40">{agent.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 hidden sm:block">
                    {agent.dept}
                  </span>
                  <Badge
                    variant={agent.status === "active" ? "success" : "warning"}
                  >
                    {agent.status === "active" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {agent.status === "active" ? "Active" : "Deploying"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardSection>

        {/* Recent Activity */}
        <CardSection
          title="Recent Activity"
          description="Latest platform events"
        >
          <div className="space-y-3">
            {recentActivity.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <div
                  className={`rounded-full p-1.5 ${
                    item.type === "success"
                      ? "bg-green-500/10"
                      : item.type === "warning"
                      ? "bg-yellow-500/10"
                      : "bg-blue-500/10"
                  }`}
                >
                  {item.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : item.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <Activity className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{item.action}</p>
                </div>
                <span className="text-xs text-white/40">{item.time}</span>
              </div>
            ))}
          </div>
        </CardSection>
      </div>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-white/20 text-lg italic">
          &ldquo;Are you Clawd-Pilled yet?&rdquo;
        </p>
      </motion.div>
    </div>
  )
}
