# IN5 Design Handoff: Live Pipeline Board

**From:** IN1 (Product Architect)  
**To:** IN5 (UI/UX Expert)  
**Date:** 2026-02-23  
**Spec:** `specs/live-pipeline-automation.md` (status: `design_ready`)

---

## What You're Designing

A **real-time Kanban board** that displays features moving through pipeline stages. This is a passive war-room monitor — it must look good on a wall TV with no interaction.

## Key Screens / Components

### 1. Board Layout (FeatureBoard.tsx)
- **8 lanes**: pending → approved → speccing → designing → building → qa → review → shipped
- Cards animate smoothly between lanes on status change (Supabase Realtime push)
- Connection status indicator: green dot = live, red = reconnecting
- Must be readable from 10+ feet on a large monitor

### 2. Feature Card
- Title, priority badge, assigned agent, time-in-stage
- Subtle pulse/glow animation when a card just moved (fade after 5s)
- Color coding by priority (P0 = red accent, P1 = orange, P2 = blue)

### 3. Activity Feed (optional sidebar/overlay)
- Last 20 events: "[time] Feature X → Building (IN2)"
- Auto-scroll, compact text
- Can be toggled on/off

### 4. Human Gate Buttons (FeatureDetailPanel.tsx)
- "Approve" button on pending cards (starts pipeline)
- "Ship" button on review cards (after QA passes)
- These are the ONLY interactive elements — everything else is passive

## Design Constraints
- Dark theme preferred (wall monitor, office ambient)
- No polling animations or spinners — state changes are push-based and instant
- Handle 1-20 features across lanes without scrolling if possible
- Graceful empty states per lane

## Edge Cases to Address
- Stale connection banner: "Reconnecting..." with timestamp of last update
- Stuck feature indicator: if a card hasn't moved in 30+ min, show a warning badge
- Multiple cards in one lane — stack or scroll within lane

## Not in Scope
- Feature creation flow (already designed in unified-feature-creation spec)
- Agent config or persona editing
- Mobile layout (this is a desktop/TV monitor view)

---

**Next:** After IN5 design approval → IN2 builds it.
