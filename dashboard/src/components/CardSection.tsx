import { cn } from "@/lib/utils"

interface CardSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export default function CardSection({
  title,
  description,
  children,
  className,
  action,
}: CardSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            {title && (
              <h3 className="text-sm font-medium text-white">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-white/40">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
