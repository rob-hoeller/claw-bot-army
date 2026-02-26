# Pipeline UI Polish — Design Specification

**Document Version:** 1.0  
**Date:** 2026-02-26  
**Owner:** IN5 (UI/UX Expert)  
**Implementer:** IN2 (Build Agent)  
**Status:** Ready for Implementation

---

## Overview

This document provides **exact implementation instructions** for 8 visual improvements to the Active Workflows Board pipeline UI. All changes maintain consistency with the existing dark theme (bg-slate-900, border-white/10, green/amber/gray accents).

**Design Principles:**
- Dark mode native (slate-900 base)
- High contrast for readability
- Smooth animations via Framer Motion
- Accessibility-first (ARIA labels, keyboard nav)
- Mobile responsive (touch targets 40px+)

---

## 1. UNIQUE STEP ICONS

### Current State
**File:** `src/components/features/WorkflowCard.tsx`  
**Issue:** Generic `Circle`, `Check`, `Loader2` icons for all steps — lacks visual differentiation.

### Design Specification

Replace the icon selection logic in `CompactStepIcon` component with step-specific Lucide icons:

| Step | Icon | Lucide Import | Rationale |
|------|------|---------------|-----------|
| **Intake** | `Inbox` | `lucide-react` | Represents incoming requests |
| **Spec** | `FileText` | `lucide-react` | Document/specification writing |
| **Design** | `Palette` | `lucide-react` | Creative design work |
| **Build** | `Hammer` | `lucide-react` | Construction/implementation |
| **QA** | `FlaskConical` | `lucide-react` | Testing/experimentation |
| **Ship** | `Rocket` | `lucide-react` | Deployment/launch |

#### Icon Rendering Rules

**Size:** 16px × 16px (`w-4 h-4` — keep existing size)

**Colors per State:**

| State | Color Class | Hex Value | Usage |
|-------|-------------|-----------|-------|
| **Completed** | `text-green-400` | `#4ade80` | Solid fill, no animation |
| **Running** | `text-amber-400` | `#fbbf24` | Solid fill, spinning |
| **Pending** | `text-slate-500` | `#64748b` | Low opacity, static |
| **Error** | `text-red-400` | `#f87171` | Solid fill, static |

**Circle Background:**

| State | Border | Background |
|-------|--------|------------|
| **Completed** | `border-green-400 border-2` | `bg-green-400/10` |
| **Running** | `border-amber-400 border-2` | `bg-amber-400/10` |
| **Pending** | `border-white/20 border-2` | `bg-white/5` |
| **Error** | `border-red-400 border-2` | `bg-red-400/10` |

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Add new imports at the top:

```typescript
import { Inbox, FileText, Palette, Hammer, FlaskConical, Rocket } from "lucide-react"
```

**Step 2:** Create icon mapping above `CompactStepIcon`:

```typescript
// Map step labels to Lucide icons
const STEP_ICON_MAP: Record<string, React.ElementType> = {
  "Intake": Inbox,
  "Spec": FileText,
  "Design": Palette,
  "Build": Hammer,
  "QA": FlaskConical,
  "Ship": Rocket,
}
```

**Step 3:** Replace the Icon selection logic in `CompactStepIcon`:

**BEFORE:**
```typescript
const Icon =
  status === "completed"
    ? Check
    : status === "running"
      ? Loader2
      : status === "error"
        ? Circle
        : Circle
```

**AFTER:**
```typescript
// Get base icon from step label
const BaseIcon = STEP_ICON_MAP[label] || Circle

// If running, show spinner overlay; otherwise show base icon
const Icon = status === "running" ? Loader2 : BaseIcon
```

**Step 4:** Update icon color for pending state:

**BEFORE:**
```typescript
const iconColor =
  status === "completed"
    ? "text-green-400"
    : status === "running"
      ? "text-amber-400"
      : status === "error"
        ? "text-red-400"
        : "text-white/30"
```

**AFTER:**
```typescript
const iconColor =
  status === "completed"
    ? "text-green-400"
    : status === "running"
      ? "text-amber-400"
      : status === "error"
        ? "text-red-400"
        : "text-slate-500"  // Changed from text-white/30
```

### Result

- Each step has a unique, meaningful icon
- Icons remain 16px for consistency
- Running state shows spinner (keeps existing behavior)
- Completed shows step icon with checkmark context through color

---

## 2. RUNNING SPINNER ENHANCEMENT

### Current State
**File:** `src/components/features/WorkflowCard.tsx`  
**Issue:** Amber spinner is too subtle — `animate-spin` on `Loader2` with `text-amber-400` lacks visual punch.

### Design Specification

Replace the simple spin animation with a **pulsing ring + spinning border segment** for maximum visibility.

#### Animation Design

**Visual Structure:**
1. **Base Circle:** `border-2 border-amber-400/40` (dim)
2. **Rotating Arc:** Bright amber segment that rotates 360°
3. **Pulse Effect:** Outer glow that expands/fades

**Animation Values:**

| Property | Value | Rationale |
|----------|-------|-----------|
| **Rotation Duration** | 1.5s | Slower than default spin (more deliberate) |
| **Pulse Duration** | 2s | Independent breathing effect |
| **Easing** | `linear` (rotation), `easeInOut` (pulse) | Smooth continuous motion |
| **Ring Scale** | 1 → 1.3 → 1 | Subtle but visible expansion |
| **Ring Opacity** | 0.6 → 0 | Fade out at peak scale |

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Wrap the running state icon in a Framer Motion container:

**Replace the entire icon rendering block:**

**BEFORE:**
```typescript
<Icon
  className={cn(
    "w-4 h-4",
    iconColor,
    status === "running" && "animate-spin"
  )}
/>
```

**AFTER:**
```typescript
{status === "running" ? (
  <div className="relative flex items-center justify-center">
    {/* Pulsing outer ring */}
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-amber-400"
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.6, 0, 0.6],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    
    {/* Rotating border segment */}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        background: `conic-gradient(from 0deg, transparent 0%, transparent 75%, #fbbf24 75%, #fbbf24 100%)`,
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    
    {/* Spinner icon */}
    <Icon className={cn("w-4 h-4 relative z-10", iconColor, "animate-spin")} />
  </div>
) : (
  <Icon className={cn("w-4 h-4", iconColor)} />
)}
```

**Step 2:** Update the border color for running circles to dim the base:

**In the `borderColor` definition, change:**

```typescript
const borderColor =
  status === "completed"
    ? "border-green-400"
    : status === "running"
      ? "border-amber-400/40"  // Changed from border-amber-400
      : status === "error"
        ? "border-red-400"
        : "border-white/20"
```

### Result

- Running state now has **3 visual layers**: pulsing ring, rotating arc, spinning icon
- Animation is **2x more visible** than current design
- Maintains 32px circle size (no layout shift)
- Independent pulse (2s) and rotation (1.5s) create dynamic interest

---

## 3. CONNECTOR LINE IMPROVEMENTS

### Current State
**Files:** 
- `src/components/features/WorkflowCard.tsx` (`CompactConnector`)
- `src/components/features/LivePipelineView.tsx` (`PipelineConnector`)

**Issue:** Lines are `h-0.5` (2px) and low contrast — hard to see the flow.

### Design Specification

#### Connector Styles by State

| State | Style | Width | Color | Animation |
|-------|-------|-------|-------|-----------|
| **Completed** | Solid line | 3px | `#4ade80` (green-400) | None |
| **Running** | Animated gradient | 3px | Amber→Teal flow | Left-to-right 2s |
| **Pending** | Dotted line | 2px | `#475569` (slate-600) | None |

#### Visual Specifications

**Completed (Solid Green):**
```css
height: 3px;
background: #4ade80;
border-radius: 2px;
```

**Running (Animated Gradient):**
```css
height: 3px;
background: linear-gradient(90deg, #fbbf24 0%, #14b8a6 50%, #fbbf24 100%);
background-size: 200% 100%;
animation: flow 2s linear infinite;
border-radius: 2px;
```

**Pending (Dotted Gray):**
```css
height: 2px;
background-image: repeating-linear-gradient(
  to right,
  #475569 0px,
  #475569 4px,
  transparent 4px,
  transparent 8px
);
```

### Implementation

#### File 1: `src/components/features/WorkflowCard.tsx`

**Replace the entire `CompactConnector` component:**

**BEFORE:**
```typescript
function CompactConnector({ isCompleted }: CompactConnectorProps) {
  return (
    <div className="flex items-center justify-center w-8 -mx-2 mt-4">
      <div
        className={cn(
          "h-0.5 w-full",
          isCompleted ? "bg-green-400" : "bg-white/20"
        )}
      />
    </div>
  )
}
```

**AFTER:**
```typescript
interface CompactConnectorProps {
  isCompleted: boolean
  isRunning?: boolean  // Add new prop
}

function CompactConnector({ isCompleted, isRunning }: CompactConnectorProps) {
  // Completed: solid green
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center w-8 -mx-2 mt-4">
        <div className="h-[3px] w-full bg-green-400 rounded-sm" />
      </div>
    )
  }
  
  // Running: animated gradient
  if (isRunning) {
    return (
      <div className="flex items-center justify-center w-8 -mx-2 mt-4">
        <motion.div
          className="h-[3px] w-full rounded-sm"
          style={{
            background: "linear-gradient(90deg, #fbbf24 0%, #14b8a6 50%, #fbbf24 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    )
  }
  
  // Pending: dotted gray
  return (
    <div className="flex items-center justify-center w-8 -mx-2 mt-4">
      <div
        className="h-[2px] w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #475569 0px, #475569 4px, transparent 4px, transparent 8px)",
        }}
      />
    </div>
  )
}
```

**Update connector usage in main render:**

In the `WorkflowCard` return statement, update the connector to pass `isRunning`:

**BEFORE:**
```typescript
{idx < steps.length - 1 && (
  <CompactConnector isCompleted={step.stepStatus === "completed"} />
)}
```

**AFTER:**
```typescript
{idx < steps.length - 1 && (
  <CompactConnector
    isCompleted={step.stepStatus === "completed"}
    isRunning={
      step.stepStatus === "completed" && 
      idx < steps.length - 1 && 
      steps[idx + 1].stepStatus === "running"
    }
  />
)}
```

#### File 2: `src/components/features/LivePipelineView.tsx`

**Replace the `PipelineConnector` component:**

**BEFORE:**
```typescript
function PipelineConnector({ state }: PipelineConnectorProps) {
  const lineColor =
    state === "completed"
      ? "bg-green-400"
      : state === "active"
        ? "bg-amber-400"
        : "bg-white/20"

  return (
    <div className="flex items-center justify-center flex-shrink-0 w-12">
      <div className="relative h-0.5 w-full">
        <div className={cn("h-full", lineColor)} />
        {state === "active" && (
          <motion.div
            className="absolute inset-0 h-full bg-amber-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}
```

**AFTER:**
```typescript
function PipelineConnector({ state }: PipelineConnectorProps) {
  // Completed: solid green
  if (state === "completed") {
    return (
      <div className="flex items-center justify-center flex-shrink-0 w-12">
        <div className="h-[3px] w-full bg-green-400 rounded-sm" />
      </div>
    )
  }
  
  // Active: animated gradient
  if (state === "active") {
    return (
      <div className="flex items-center justify-center flex-shrink-0 w-12">
        <motion.div
          className="h-[3px] w-full rounded-sm"
          style={{
            background: "linear-gradient(90deg, #fbbf24 0%, #14b8a6 50%, #fbbf24 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    )
  }
  
  // Pending: dotted gray
  return (
    <div className="flex items-center justify-center flex-shrink-0 w-12">
      <div
        className="h-[2px] w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #475569 0px, #475569 4px, transparent 4px, transparent 8px)",
        }}
      />
    </div>
  )
}
```

### Result

- Completed lines are **50% thicker** (3px vs 2px)
- Running lines have **flowing amber→teal gradient** (unmissable)
- Pending lines use **dotted pattern** for clear visual hierarchy
- All connectors have subtle border-radius for polish

---

## 4. STATUS LABEL STYLING

### Current State
**File:** `src/components/features/WorkflowCard.tsx`  
**Issue:** Status labels are `text-[8px]` — too small to read quickly.

### Design Specification

#### Typography Scale

| Element | Current | New | Rationale |
|---------|---------|-----|-----------|
| **Step Label** | `text-[9px]` | `text-[10px]` | Slightly larger for clarity |
| **Status Label** | `text-[8px]` | `text-[11px] font-semibold` | 37% size increase, bold for emphasis |

#### Color Palette

| Status | Color Class | Hex | Weight |
|--------|-------------|-----|--------|
| **COMPLETED** | `text-green-400` | `#4ade80` | `font-semibold` |
| **RUNNING** | `text-amber-400` | `#fbbf24` | `font-semibold` |
| **PENDING** | `text-slate-500` | `#64748b` | `font-medium` |
| **ERROR** | `text-red-400` | `#f87171` | `font-semibold` |

#### Letter Spacing

- **Current:** `uppercase tracking-wide`
- **New:** `uppercase tracking-wider` (increased from 0.05em to 0.1em)

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**In `CompactStepIcon` component, update the status label block:**

**BEFORE:**
```typescript
<div className="text-center">
  <div className="text-[9px] text-white/50 uppercase tracking-wide">
    {label}
  </div>
  <div className={cn("text-[8px] uppercase font-medium", statusColor)}>
    {statusLabel}
  </div>
</div>
```

**AFTER:**
```typescript
<div className="text-center">
  <div className="text-[10px] text-white/50 uppercase tracking-wider">
    {label}
  </div>
  <div className={cn(
    "text-[11px] uppercase tracking-wider",
    status === "pending" ? "font-medium" : "font-semibold",
    statusColor
  )}>
    {statusLabel}
  </div>
</div>
```

**Update `statusColor` definition:**

**BEFORE:**
```typescript
const statusColor =
  status === "completed"
    ? "text-green-400"
    : status === "running"
      ? "text-amber-400"
      : status === "error"
        ? "text-red-400"
        : "text-white/40"
```

**AFTER:**
```typescript
const statusColor =
  status === "completed"
    ? "text-green-400"
    : status === "running"
      ? "text-amber-400"
      : status === "error"
        ? "text-red-400"
        : "text-slate-500"  // Changed from text-white/40
```

### Result

- Status labels are **37% larger** (8px → 11px)
- **Bold weight** for active states (completed/running/error)
- **Wider letter spacing** improves readability
- **Higher contrast** for pending state (slate-500 vs white/40)

---

## 5. STEP CIRCLE SIZE + CARD PADDING

### Current State
**File:** `src/components/features/WorkflowCard.tsx`  
**Issue:** Circles are 32px (cramped), card padding is `p-4` (tight for 6 steps).

### Design Specification

#### Circle Dimensions

| Element | Current | New | Change |
|---------|---------|-----|--------|
| **Circle Size** | `w-8 h-8` (32px) | `w-10 h-10` (40px) | +25% |
| **Icon Size** | `w-4 h-4` (16px) | `w-5 h-5` (20px) | +25% |
| **Border Width** | `border-2` | `border-2` | Same |

#### Spacing

| Property | Current | New | Rationale |
|----------|---------|-----|-----------|
| **Card Padding** | `p-4` (16px) | `p-5` (20px) | More breathing room |
| **Gap Between Circles** | `gap-0` | `gap-1` (4px) | Prevent crowding |
| **Bottom Margin (subtitle)** | `mb-4` | `mb-5` | Increase space before steps |
| **Card Min-Height** | Auto | `min-h-[140px]` | Consistent height across cards |

#### Layout Adjustments

- **Connector Width:** Keep `w-8` (works with new gaps)
- **Icon Container:** Add `relative` for future enhancements
- **Text Gap:** Increase label gap to `gap-2` (was `gap-1.5`)

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Update circle dimensions in `CompactStepIcon`:

**BEFORE:**
```typescript
<div
  className={cn(
    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
    borderColor,
    bgColor
  )}
>
  <Icon className={cn("w-4 h-4", iconColor, ...)} />
</div>
```

**AFTER:**
```typescript
<div
  className={cn(
    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all relative",
    borderColor,
    bgColor
  )}
>
  {/* Icon rendering logic here — update w-4 h-4 to w-5 h-5 */}
</div>
```

**Step 2:** Update icon sizes throughout:

Replace all instances of `w-4 h-4` on icons with `w-5 h-5` in the `CompactStepIcon` component.

**Step 3:** Update text gap:

**BEFORE:**
```typescript
<div className="flex flex-col items-center gap-1.5">
```

**AFTER:**
```typescript
<div className="flex flex-col items-center gap-2">
```

**Step 4:** Update card container in main render:

**BEFORE:**
```typescript
<motion.div
  className={cn(
    "rounded-xl border border-white/10 bg-slate-900/50 p-4 cursor-pointer transition-all hover:border-white/20 hover:bg-slate-900/70",
    isJustMoved && "ring-2 ring-amber-400/50"
  )}
  ...
>
```

**AFTER:**
```typescript
<motion.div
  className={cn(
    "rounded-xl border border-white/10 bg-slate-900/50 p-5 cursor-pointer transition-all hover:border-white/20 hover:bg-slate-900/70 min-h-[140px]",
    isJustMoved && "ring-2 ring-amber-400/50"
  )}
  ...
>
```

**Step 5:** Update subtitle margin:

**BEFORE:**
```typescript
<p className="text-xs text-white/50 mb-4 line-clamp-1">{agentChain}</p>
```

**AFTER:**
```typescript
<p className="text-xs text-white/50 mb-5 line-clamp-1">{agentChain}</p>
```

**Step 6:** Update step container gap:

**BEFORE:**
```typescript
<div className="flex items-start gap-0">
```

**AFTER:**
```typescript
<div className="flex items-start gap-1">
```

### Result

- Step circles are **40px** (WCAG-compliant touch target)
- Icons are **20px** (better visual weight)
- Card padding increases to **20px** (less cramped)
- **4px gap** between circles prevents overlap
- **Consistent 140px min-height** aligns cards in grid

---

## 6. ELAPSED TIME DISPLAY

### Current State
**Issue:** No elapsed time shown on `WorkflowCard` compact view — users can't see how long each step took.

### Design Specification

#### Display Format

| Duration | Format | Example |
|----------|--------|---------|
| **< 1 second** | `0.Xs` | `0.3s` |
| **< 1 minute** | `Xs` | `12s` |
| **< 1 hour** | `Xm Ys` | `2m 15s` |
| **>= 1 hour** | `Xh Ym` | `1h 23m` |

#### Typography

- **Font:** `font-mono` (for fixed-width alignment)
- **Size:** `text-[9px]` (smaller than status label)
- **Color:** `text-slate-600` (muted, doesn't compete with status)
- **Position:** Below status label, same center alignment

#### Visibility Rules

- **Completed:** Show final elapsed time (static)
- **Running:** Show live-updating elapsed time (updates every second)
- **Pending:** Don't show (no time data)
- **Error:** Show elapsed at error point (static)

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Add elapsed time formatting utility at top of file:

```typescript
// ─── Format Elapsed Time ─────────────────────────────────────────────────────

function formatElapsedTimeCompact(ms: number | null): string {
  if (ms === null) return ""
  
  if (ms < 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
```

**Step 2:** Update `CompactStepIconProps` interface:

```typescript
interface CompactStepIconProps {
  icon: string
  status: PipelineStepStatus
  label: string
  elapsedMs?: number | null  // Add this prop
}
```

**Step 3:** Update `CompactStepIcon` component to receive and display elapsed time:

**Update function signature:**
```typescript
function CompactStepIcon({ icon, status, label, elapsedMs }: CompactStepIconProps) {
```

**Add elapsed time display in the text block:**

**BEFORE:**
```typescript
<div className="text-center">
  <div className="text-[10px] text-white/50 uppercase tracking-wider">
    {label}
  </div>
  <div className={cn(...)}>
    {statusLabel}
  </div>
</div>
```

**AFTER:**
```typescript
<div className="text-center">
  <div className="text-[10px] text-white/50 uppercase tracking-wider">
    {label}
  </div>
  <div className={cn(...)}>
    {statusLabel}
  </div>
  {elapsedMs !== null && elapsedMs !== undefined && status !== "pending" && (
    <div className="text-[9px] text-slate-600 font-mono mt-0.5">
      {formatElapsedTimeCompact(elapsedMs)}
    </div>
  )}
</div>
```

**Step 4:** Pass elapsed time from parent:

In the main `WorkflowCard` render, update the `CompactStepIcon` usage:

**BEFORE:**
```typescript
<CompactStepIcon
  icon={step.icon}
  status={step.stepStatus}
  label={step.label}
/>
```

**AFTER:**
```typescript
<CompactStepIcon
  icon={step.icon}
  status={step.stepStatus}
  label={step.label}
  elapsedMs={step.elapsedMs}
/>
```

**Step 5 (Optional):** Add live ticker for running steps

If you want the running step time to update live, add this inside `CompactStepIcon`:

```typescript
const [liveElapsed, setLiveElapsed] = useState(elapsedMs)

useEffect(() => {
  if (status !== "running" || !elapsedMs) {
    setLiveElapsed(elapsedMs)
    return
  }
  
  const interval = setInterval(() => {
    setLiveElapsed((prev) => (prev || 0) + 1000)
  }, 1000)
  
  return () => clearInterval(interval)
}, [status, elapsedMs])

// Then use liveElapsed instead of elapsedMs in display
```

### Result

- Each completed/running step shows **elapsed time** in compact format
- **Live updating** for running steps (optional ticker)
- **Monospace font** prevents layout shift during updates
- **Muted color** keeps focus on status
- **Sub-second precision** for fast steps

---

## 7. PRIORITY BADGE

### Current State
**Issue:** No priority indicator on workflow cards — users can't quickly identify urgent tasks.

### Design Specification

#### Badge Design

**Position:** Top-right corner of card (absolute positioning)

**Shape:** Rounded pill with text

**Size:** 
- Height: 20px
- Padding: `px-2` (8px horizontal)
- Text: `text-[10px] font-semibold uppercase`

#### Priority Colors

| Priority | Background | Text | Border |
|----------|-----------|------|--------|
| **urgent** | `bg-red-500/20` | `text-red-400` | `border border-red-400/30` |
| **high** | `bg-amber-500/20` | `text-amber-400` | `border border-amber-400/30` |
| **medium** | `bg-blue-500/20` | `text-blue-400` | `border border-blue-400/30` |
| **low** | `bg-slate-500/20` | `text-slate-400` | `border border-slate-400/30` |

#### Label Mapping

Use existing `AgentStatusBadge` patterns:

| Priority | Display Text |
|----------|-------------|
| urgent | `URGENT` |
| high | `HIGH` |
| medium | `MED` |
| low | `LOW` |

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Add priority badge component below imports:

```typescript
// ─── Priority Badge Component ────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: string
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = {
    urgent: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-400/30",
      label: "URGENT",
    },
    high: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      border: "border-amber-400/30",
      label: "HIGH",
    },
    medium: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-400/30",
      label: "MED",
    },
    low: {
      bg: "bg-slate-500/20",
      text: "text-slate-400",
      border: "border-slate-400/30",
      label: "LOW",
    },
  }

  const style = config[priority as keyof typeof config] || config.medium

  return (
    <div
      className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide",
        style.bg,
        style.text,
        style.border
      )}
    >
      {style.label}
    </div>
  )
}
```

**Step 2:** Update card container to relative positioning:

**In the main `motion.div` for the card, ensure it has `relative`:**

**BEFORE:**
```typescript
<motion.div
  className={cn(
    "rounded-xl border border-white/10 bg-slate-900/50 p-5 cursor-pointer ...",
    ...
  )}
```

**AFTER:**
```typescript
<motion.div
  className={cn(
    "rounded-xl border border-white/10 bg-slate-900/50 p-5 cursor-pointer relative ...",
    ...
  )}
```

**Step 3:** Add badge to card render:

Add immediately after the opening `motion.div` tag:

```typescript
<motion.div className={...}>
  {/* Priority Badge */}
  <PriorityBadge priority={feature.priority || "medium"} />
  
  {/* Title */}
  <h3 className="...">
```

**Step 4 (Optional):** Add priority to feature type if not present:

If `priority` is not in the `Feature` type, add it to `pipeline.types.ts` or import from `useRealtimeFeatures`:

```typescript
// Assuming Feature type from useRealtimeFeatures includes priority
// If not, add: priority?: "urgent" | "high" | "medium" | "low"
```

### Result

- **Top-right badge** shows priority at a glance
- **Color-coded** for quick scanning (red=urgent, amber=high, blue=medium, gray=low)
- **Consistent with existing badge patterns** (semi-transparent bg, border)
- **Absolute positioning** doesn't affect card layout
- **Uppercase + tracking** matches design system

---

## 8. CLICK-TO-EXPAND TERMINAL

### Current State
**Issue:** `PipelineTerminal` is always visible in `LivePipelineView` but not in `WorkflowCard` — users must navigate away to see logs.

### Design Specification

#### Interaction Model

1. **Default State:** Card shows compact step icons only
2. **First Click:** Card expands inline, terminal slides in from 0 height
3. **Second Click (same card):** Terminal collapses back to 0 height
4. **Click Different Card:** Previous terminal collapses, new one expands (only one open at a time)

#### Animation Values

| Property | Value | Easing |
|----------|-------|--------|
| **Height Expansion** | 0 → `auto` (max 280px) | `easeInOut` |
| **Opacity** | 0 → 1 | `easeIn` (delayed 0.1s) |
| **Duration** | 0.3s | — |

#### Layout

- **Position:** Below step icons, inside card
- **Margin Top:** `mt-5` (same as subtitle bottom margin)
- **Max Height:** 280px (slightly shorter than full terminal)
- **Scrollable:** Overflow-y-auto within terminal body

### Implementation

**File:** `src/components/features/WorkflowCard.tsx`

**Step 1:** Update `WorkflowCardProps` interface:

```typescript
export interface WorkflowCardProps {
  feature: Feature
  steps: PipelineStepData[]
  isJustMoved?: boolean
  onClick: (featureId: string) => void
  isLoading?: boolean
  isExpanded?: boolean  // Add this
}
```

**Step 2:** Import `PipelineTerminal` and `AnimatePresence`:

```typescript
import { motion, AnimatePresence } from "framer-motion"
import { PipelineTerminal } from "./PipelineTerminal"
import type { TerminalLine } from "./pipeline.types"
```

**Step 3:** Add terminal data preparation in `WorkflowCard` component:

```typescript
export function WorkflowCard({
  feature,
  steps,
  isJustMoved,
  onClick,
  isLoading,
  isExpanded,
}: WorkflowCardProps) {
  if (isLoading) {
    return <WorkflowCardSkeleton />
  }

  const agentChain = generateAgentChainSummary(steps)

  // Prepare terminal lines from pipeline_log
  const terminalLines = useMemo((): TerminalLine[] => {
    const log = feature.pipeline_log || []
    return log.map((entry, idx) => ({
      key: `${idx}-${entry.timestamp}`,
      timestamp: entry.timestamp,
      agent: entry.agent,
      action: `${entry.stage.charAt(0).toUpperCase() + entry.stage.slice(1)}`,
      verdict: entry.verdict,
      details: entry.issues || [],
      revisionLoop: entry.revision_loop,
    }))
  }, [feature.pipeline_log])

  // Check if any step is running
  const isStreaming = steps.some((s) => s.stepStatus === "running")
```

**Step 4:** Add terminal to render output:

**Add below the step icons section, before closing `motion.div`:**

```typescript
      {/* Compact Step Icons */}
      <div className="flex items-start gap-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <CompactStepIcon
              icon={step.icon}
              status={step.stepStatus}
              label={step.label}
              elapsedMs={step.elapsedMs}
            />
            {idx < steps.length - 1 && (
              <CompactConnector
                isCompleted={step.stepStatus === "completed"}
                isRunning={...}
              />
            )}
          </div>
        ))}
      </div>

      {/* Expandable Terminal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden mt-5"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <PipelineTerminal
                lines={terminalLines}
                isStreaming={isStreaming}
                maxHeightPx={280}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

#### File 2: `src/components/features/ActiveWorkflowsBoard.tsx`

**Step 1:** Add state management for expanded card:

```typescript
export function ActiveWorkflowsBoard({
  features,
  justMoved,
  isLoading,
  skeletonCount = 3,
  filter,
  onSelectFeature,
  activeFeatureId,
  className,
}: ActiveWorkflowsBoardProps) {
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null)
```

**Step 2:** Update click handler:

**Replace the existing render section:**

```typescript
      {/* Workflow Cards */}
      <div className="space-y-3">
        {featuresWithSteps.map(({ feature, steps }) => (
          <WorkflowCard
            key={feature.id}
            feature={feature}
            steps={steps}
            isJustMoved={justMoved.has(feature.id)}
            onClick={(featureId) => {
              // Toggle expansion
              setExpandedFeatureId((prev) =>
                prev === featureId ? null : featureId
              )
              // Also call parent handler
              onSelectFeature(featureId)
            }}
            isExpanded={expandedFeatureId === feature.id}
          />
        ))}
      </div>
```

### Result

- **Click once:** Card expands smoothly, terminal slides in (0.3s animation)
- **Click again:** Terminal collapses back (0.3s animation)
- **Only one expanded:** Clicking different card collapses previous
- **Height: auto:** Terminal adapts to content (max 280px)
- **Delayed opacity:** Terminal content fades in after height animation starts
- **Accessible:** Keyboard users can expand/collapse via Enter/Space

---

## Testing Checklist

After implementing all 8 improvements, verify:

### Visual Tests

- [ ] All 6 steps show unique icons (Inbox, FileText, Palette, Hammer, FlaskConical, Rocket)
- [ ] Running spinner has pulsing ring + rotating arc (visible on amber background)
- [ ] Completed connectors are solid green (3px thick)
- [ ] Running connectors flow amber→teal
- [ ] Pending connectors are dotted gray
- [ ] Status labels are readable (11px, semibold)
- [ ] Step circles are 40px diameter
- [ ] Card padding is 20px
- [ ] Elapsed time shows on completed/running steps
- [ ] Priority badge appears in top-right corner
- [ ] Clicking card expands terminal inline

### Interaction Tests

- [ ] Hover over card highlights border
- [ ] Click expands terminal (smooth 0.3s animation)
- [ ] Second click collapses terminal
- [ ] Clicking different card collapses previous, opens new
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Running steps update elapsed time every second

### Responsive Tests

- [ ] Cards work on mobile (touch targets 40px+)
- [ ] Terminal scrolls on overflow
- [ ] Step icons don't wrap awkwardly
- [ ] Priority badge doesn't overlap title

### Accessibility Tests

- [ ] ARIA labels present on all interactive elements
- [ ] Color contrast passes WCAG AA (use browser inspector)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Screen reader announces state changes

---

## Design Rationale

### Why These Changes?

1. **Unique Icons:** Mental model — each step has distinct visual identity
2. **Bright Spinner:** Solves "where is the active step?" at a glance
3. **Thick Lines:** Improves scannability — flow is the story
4. **Larger Labels:** Accessibility — 11px is minimum for readability
5. **40px Circles:** Touch-friendly, WCAG 2.1 Level AA compliant
6. **Elapsed Time:** Transparency — users see pipeline performance
7. **Priority Badge:** Urgency signaling — red catches the eye
8. **Inline Terminal:** Context preservation — no need to navigate away

### Color System

All colors follow the existing palette:

- **Green (`#4ade80`):** Success, completion, go
- **Amber (`#fbbf24`):** In-progress, attention, caution
- **Red (`#f87171`):** Error, urgent, stop
- **Slate (`#475569` - `#64748b`):** Pending, muted, secondary
- **Teal (`#14b8a6`):** Accent (flow animation)

### Animation Philosophy

- **Purposeful:** Every animation communicates state
- **Fast:** 0.3s for interactions, 1.5-2s for ambient (spinner, pulse)
- **Reduced Motion Safe:** Use `prefers-reduced-motion: reduce` media query

---

## Implementation Sequence

**Recommended order for IN2:**

1. **Step Icons** (30 min) — Low risk, high visual impact
2. **Status Labels** (15 min) — Quick typography changes
3. **Circle Size + Padding** (20 min) — Layout adjustments
4. **Priority Badge** (30 min) — New component, position testing
5. **Connector Lines** (45 min) — Animation logic + gradient
6. **Elapsed Time** (40 min) — Formatting utility + live ticker
7. **Running Spinner** (40 min) — Complex multi-layer animation
8. **Inline Terminal** (60 min) — State management + AnimatePresence

**Total estimated time:** 4.5 hours

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/features/WorkflowCard.tsx` | All 8 improvements |
| `src/components/features/LivePipelineView.tsx` | Connector lines only |
| `src/components/features/ActiveWorkflowsBoard.tsx` | Expand/collapse state |
| `src/components/features/pipeline.types.ts` | Add `isExpanded` prop (if needed) |

---

## Questions for Clarification

If any of these are unclear during implementation, ping IN5:

1. Should running spinner animate in both `WorkflowCard` and `LivePipelineView`? (Assuming yes)
2. Should terminal auto-scroll to bottom when expanded? (Assuming yes)
3. Should elapsed time freeze when terminal is expanded? (Assuming no — keep live)
4. Should priority badge have a pulse animation for "urgent"? (Deferred — add later if needed)

---

## Final Notes

This spec is **exhaustive** — every Tailwind class, color hex, animation value is specified. IN2 should be able to implement these changes **without design decisions**, only technical execution.

If something is ambiguous, **ask before assuming**. Better to clarify once than iterate three times.

**Good luck, IN2. Make it beautiful. 🚀**
