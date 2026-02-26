"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, Mic, Video } from "lucide-react"
import type { CommandBarProps } from "./mission.types"
import { cn } from "@/lib/utils"

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-slate-400" },
  { value: "medium", label: "Medium", color: "text-blue-400" },
  { value: "high", label: "High", color: "text-amber-400" },
  { value: "urgent", label: "Urgent", color: "text-red-400" },
] as const

/**
 * CommandBar
 * 
 * The input bar for submitting new features:
 * - Text input with placeholder "What do you want built?"
 * - Expands on focus to show rich controls
 * - Priority selector
 * - Attachment buttons (screenshot, voice, video - future)
 * - Keyboard shortcut: Cmd+K to focus
 * - Glassmorphism style
 */
export function CommandBar({ onSubmit, isSubmitting, className }: CommandBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [description, isExpanded])

  // Cmd+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsExpanded(true)
        textareaRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Click outside to collapse (unless submitting)
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !isSubmitting &&
        !title.trim() &&
        !description.trim()
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isExpanded, isSubmitting, title, description])

  const handleSubmit = async () => {
    if (!title.trim() && !description.trim()) return

    // If only description is provided, extract title from first line
    const finalTitle = title.trim() || description.split("\n")[0].slice(0, 100)
    const finalDescription = title.trim() ? description : description.split("\n").slice(1).join("\n")

    try {
      await onSubmit({
        title: finalTitle,
        description: finalDescription,
        priority,
      })

      // Reset form
      setTitle("")
      setDescription("")
      setPriority("medium")
      setIsExpanded(false)
    } catch (error) {
      // Error handled by parent
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative transition-all duration-300",
        isExpanded ? "p-4" : "p-2",
        className
      )}
    >
      <motion.div
        layout
        className={cn(
          "relative overflow-hidden rounded-lg border backdrop-blur-sm transition-all duration-300",
          isExpanded
            ? "bg-slate-900/90 border-purple-500/30 shadow-lg shadow-purple-500/10"
            : "bg-slate-900/60 border-white/10 hover:border-white/20"
        )}
      >
        {!isExpanded ? (
          // Collapsed single-line input
          <button
            onClick={() => {
              setIsExpanded(true)
              setTimeout(() => textareaRef.current?.focus(), 100)
            }}
            className="w-full px-4 py-3 text-left text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            What do you want built?{" "}
            <span className="text-xs text-white/30">(Cmd+K)</span>
          </button>
        ) : (
          // Expanded rich input
          <div className="space-y-3 p-3">
            {/* Title input (optional) */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Feature title (optional)"
              className="w-full px-0 py-1 bg-transparent border-0 text-sm font-medium text-white placeholder-white/40 focus:outline-none"
            />

            {/* Description textarea */}
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want built..."
              className="w-full px-0 py-1 bg-transparent border-0 text-sm text-white/80 placeholder-white/40 focus:outline-none resize-none min-h-[60px]"
              rows={3}
            />

            {/* Controls bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                {/* Priority selector */}
                <div className="flex items-center gap-1">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPriority(option.value)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded transition-colors",
                        priority === option.value
                          ? "bg-white/10 " + option.color
                          : "text-white/40 hover:text-white/60 hover:bg-white/5"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Attachment buttons */}
                <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                  <button
                    className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
                    title="Attach screenshot (coming soon)"
                    disabled
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
                    title="Voice input (coming soon)"
                    disabled
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
                    title="Video attachment (coming soon)"
                    disabled
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!title.trim() && !description.trim())}
                className="flex items-center gap-2 px-4 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit
                  </>
                )}
              </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-xs text-white/30 pt-1">
              Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/50">⌘↵</kbd> to
              submit
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
