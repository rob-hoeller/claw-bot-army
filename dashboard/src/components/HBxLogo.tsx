import { cn } from "@/lib/utils"

interface HBxLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  className?: string
}

export default function HBxLogo({
  size = "lg",
  showTagline = true,
  className,
}: HBxLogoProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("font-bold tracking-tight", sizeClasses[size])}>
        <span className="text-white/70">H</span>
        <span className="text-white/70">B</span>
        <span className="text-white/50">x</span>
      </div>
      {showTagline && (
        <div className="text-white/30 text-xs tracking-[0.3em] mt-2 uppercase">
          Master Orchestrator
        </div>
      )}
    </div>
  )
}
