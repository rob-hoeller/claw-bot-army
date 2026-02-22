# CRM Engine Research Report: Attio vs Zoho CRM vs Build-Our-Own

**Prepared for:** HBx AI Agent Platform — Schell Brothers  
**Date:** 2026-02-22  
**Researcher:** IN3 (Research Lab)  
**Status:** Strategic Decision Document

---

## Executive Summary

Schell Brothers needs a CRM engine to power the HBx AI Agent Platform. This report evaluates three options: integrating **Attio** (modern, API-first CRM), integrating **Zoho CRM** (mature, feature-rich enterprise CRM), or **building a custom CRM** using our Code Factory pipeline. A fourth hybrid option is also considered.

**TL;DR Recommendation:** **Option D — Hybrid: Attio as CRM engine + custom HBx modules** for homebuilder-specific functionality. Attio's modern API, custom objects, webhooks, MCP server, and AI-native architecture make it the ideal backbone for an AI agent platform. Supplement with custom modules for homebuilder-specific workflows (community tracking, Schellter™ specs, construction milestones).

---

## 1. Product Overview

### Attio

| Attribute | Details |
|-----------|---------|
| **Founded** | 2019 (London, UK) |
| **Funding** | ~$85M+ total ($33M Series A Aug 2024, $52M Series B Aug 2025) |
| **Market Position** | Fast-growing "next-gen CRM" challenger. AI-native positioning. |
| **Target Market** | Startups, scale-ups, tech-forward mid-market teams |
| **Users** | Thousands of companies; growing rapidly in tech/VC/SaaS sectors |
| **Philosophy** | Data-driven, customizable, AI-native CRM for modern GTM teams |

**Pricing (verified from attio.com/pricing, Feb 2026):**

| Plan | Monthly | Annual | Key Limits |
|------|---------|--------|------------|
| **Free** | $0 | $0 | 3 seats, 3 objects, 50K records |
| **Plus** | $36/user/mo | $29/user/mo | 5 objects, 250K records, no seat limits |
| **Pro** | $86/user/mo | $69/user/mo | 12 objects, 1M records, sequences, call intel |
| **Enterprise** | Custom | Custom | Unlimited objects/records, SSO, advanced security |

**Key Features:**
- Real-time contact syncing from email/calendar
- Automatic data enrichment (company & people)
- Custom objects (build any data model)
- AI Attributes, AI Agents, "Ask Attio" (AI querying)
- Call Intelligence (conversation capture & analysis)
- Sequences (email automation)
- Automations/Workflows
- Full REST API, Webhooks, App SDK, MCP Server
- Reporting with funnels, segments, targets, historical data

### Zoho CRM

| Attribute | Details |
|-----------|---------|
| **Founded** | Zoho Corp founded 1996; Zoho CRM launched ~2005 |
| **Funding** | Privately held, profitable, no external funding (bootstrapped) |
| **Market Position** | Major enterprise CRM. 250,000+ businesses. Gartner Magic Quadrant regular. |
| **Target Market** | SMB to large enterprise, all industries |
| **Revenue** | Zoho Corp estimated $1B+ annual revenue |
| **Philosophy** | All-in-one business suite, privacy-focused, cost-effective Salesforce alternative |

**Pricing (USD, billed annually — from zoho.com):**

| Plan | Annual (per user/mo) | Monthly (per user/mo) | Key Features |
|------|---------------------|-----------------------|--------------|
| **Free** | $0 | $0 | 3 users, basic leads/contacts/deals |
| **Standard** | $14 | $20 | Workflows, custom modules, cadences, forecasting |
| **Professional** | $23 | $35 | Blueprint, CPQ, SalesSignals, inventory, validation rules |
| **Enterprise** | $40 | $50 | Zia AI (full), territory mgmt, journey orchestration, sandbox, portals |
| **Ultimate** | $52 | $65 | Custom AI/ML (QuickML), augmented analytics, data storytelling |

**Key Features:**
- Full sales pipeline management
- Zia AI (forecasting, anomaly detection, sentiment analysis, recommendations)
- Blueprint (process enforcement)
- Journey Orchestration
- Territory Management
- Canvas (custom UI designer)
- Kiosk Studio (no-code screens)
- 900+ marketplace integrations
- CPQ (Configure-Price-Quote)
- Multi-user portals
- Comprehensive API (REST v7)

---

## 2. API & Integration Capabilities

### Attio API

| Capability | Details |
|------------|---------|
| **API Type** | REST (JSON over HTTPS) |
| **Documentation** | Excellent. Modern docs at docs.attio.com. Has llms.txt for AI consumption. |
| **Authentication** | OAuth 2.0 + API Keys (Bearer token). Scoped permissions. |
| **Rate Limits** | 100 req/sec (reads), 25 req/sec (writes). Per-second rolling. Score-based limits on complex queries. |
| **Webhooks** | ✅ Full support. Create via API or settings. SHA256 HMAC signing. At-least-once delivery. 10 retries with exponential backoff. Field-level filtering. |
| **Custom Objects** | ✅ First-class. Create any object type with custom attributes (17 attribute types). |
| **Custom Fields** | ✅ 17 attribute types (text, number, currency, date, select, status, record reference, checkbox, rating, location, email, phone, domain, personal name, timestamp, interaction, actor reference). Multi-select supported. |
| **Bulk Operations** | Batch operations available. List/filter endpoints with pagination. |
| **App SDK** | ✅ TypeScript/React SDK for embedding apps within Attio UI |
| **MCP Server** | ✅ Native MCP support — connect Claude, ChatGPT, or any AI tool directly |
| **OpenAPI Spec** | Available for code generation |

**Attio API Verdict:** ⭐⭐⭐⭐⭐ — Best-in-class for AI agent integration. The MCP server alone is a game-changer for HBx. Modern, well-documented, generous rate limits.

### Zoho CRM API

| Capability | Details |
|------------|---------|
| **API Type** | REST v7 (JSON) |
| **Documentation** | Comprehensive but dense. Traditional API docs at zoho.com/crm/developer/docs. |
| **Authentication** | OAuth 2.0 (authorization code grant). Organization-specific tokens. Environment-specific (production/sandbox/dev). |
| **Rate Limits** | Credit-based system. Enterprise: 50,000 + (users × 1,000) credits/day, max 5M. Credits vary by operation (1-500 per call). |
| **Webhooks** | ✅ Notification APIs. Subscribe by module + operation (create/update/delete). Field-level notification conditions (v6+). Channel-based with expiry. |
| **Custom Objects** | ✅ Custom modules with layouts. Available from Standard plan. |
| **Custom Fields** | ✅ Extensive field types. API-managed field creation/updates (10 credits per field operation). |
| **Bulk Operations** | ✅ Bulk Read/Write APIs. Insert/Update up to 100 records per call. COQL query language for complex queries. |
| **Deluge Functions** | Server-side scripting language for custom logic within Zoho ecosystem |
| **COQL** | Zoho's SQL-like query language for CRM data |
| **Marketplace** | 900+ integrations. Zapier, Make, etc. |

**Zoho API Verdict:** ⭐⭐⭐⭐ — Very capable but more complex. Credit-based rate limiting requires careful management. OAuth flow is heavier. No native MCP/AI-agent support.

### Head-to-Head: API Comparison

| Factor | Attio | Zoho CRM | Winner |
|--------|-------|----------|--------|
| Developer Experience | Modern, clean, AI-friendly | Comprehensive but verbose | **Attio** |
| Rate Limits | 100 read/sec, 25 write/sec | Credit-based (complex) | **Attio** |
| Webhook Quality | Excellent (signed, filtered, retry) | Good (channel-based, expiry) | **Attio** |
| Custom Object Flexibility | Excellent (17 attr types) | Excellent (modules + layouts) | Tie |
| Bulk Operations | Good | Excellent (dedicated bulk APIs) | **Zoho** |
| Authentication | Simple (OAuth2 + API key) | Complex (org-specific OAuth2) | **Attio** |
| AI/MCP Native | ✅ MCP Server built-in | ❌ No native AI agent protocol | **Attio** |
| Ecosystem Breadth | Growing (App SDK) | Massive (900+ marketplace) | **Zoho** |
| Documentation | Excellent + llms.txt | Comprehensive but older style | **Attio** |

---

## 3. AI & Automation

### Attio AI Capabilities

- **Ask Attio** — Natural language querying of CRM data (announced Feb 2026, "Universal Context")
- **AI Attributes** — AI-generated fields that auto-populate on records (e.g., summarize company, score leads)
- **AI Agents** — Built-in AI agent framework within the CRM
- **AI Research Agent** — Web research agent that enriches records automatically
- **Call Intelligence** — AI-powered conversation capture, transcription, and insights
- **Auto-labeling & Auto-summaries** — Email intelligence
- **MCP Server** — Direct connection for external AI tools (Claude, ChatGPT, custom agents)
- **Automations/Workflows** — Trigger-based workflows with integration blocks

**AI-Native Assessment:** Attio is building from the ground up as an "AI-native" CRM. Their MCP server means HBx agents can directly read/write/query the CRM through standardized AI protocols without custom API wrappers.

### Zoho CRM AI Capabilities (Zia)

- **Zia Voice** — Conversational AI assistant
- **Sales Forecasting** — AI-predicted revenue
- **Lead/Deal Scoring** — Predictive scoring models
- **Anomaly Detection** — Flags unusual patterns in sales data
- **Churn Prediction** — Identifies at-risk accounts
- **Sentiment Analysis** — Email and call sentiment
- **Product Recommendations** — Cross-sell/upsell suggestions
- **Competitor Alerts** — Monitors competitor mentions
- **Email Intelligence** — Summaries, intent analysis, subject line suggestions
- **Generative AI** — Content generation for emails, notes
- **AI Agents for Sales** — Newer agentic AI features
- **QuickML** (Ultimate) — Custom ML model building within CRM
- **Blueprint** — Process enforcement (not AI but critical automation)
- **Journey Orchestration** — End-to-end customer journey automation
- **Cadences** — Multi-channel follow-up sequences

**AI Assessment:** Zoho has more mature, production-tested AI features (Zia has been evolving for years). However, these are internal to Zoho — integrating with external AI agents (HBx) requires API work, not native agent-to-agent communication.

### Winner for HBx Integration: **Attio**

The MCP server and AI-native architecture mean our HBx agents (Schellie, etc.) can interact with Attio as a first-class AI-accessible data store. With Zoho, we'd need to build custom middleware to bridge Zia and HBx.

---

## 4. Homebuilder / Real Estate Fit

### Pipeline Management (Long Sales Cycles: 6-18 months)

| Requirement | Attio | Zoho CRM |
|-------------|-------|----------|
| **Multi-stage pipelines** | ✅ Custom objects + status attributes | ✅ Deals module + Blueprint stages |
| **Long cycle tracking** | ✅ Historical attributes, time comparisons | ✅ Journey Orchestration, activity timeline |
| **Multiple pipelines** | ✅ Custom lists per community/product | ✅ Multiple deal pipelines natively |
| **Stage duration tracking** | ✅ Via historical attributes | ✅ Built-in stage duration analytics |

### Lead Scoring & Nurturing

| Requirement | Attio | Zoho CRM |
|-------------|-------|----------|
| **Lead scoring** | ✅ AI Attributes + custom scoring | ✅ Native Zia-powered scoring |
| **Nurture sequences** | ✅ Sequences (email) | ✅ Cadences (multi-channel) |
| **Engagement tracking** | ✅ Communication intelligence | ✅ SalesSignals (real-time) |

**Winner: Zoho** — More mature lead scoring with Zia, multi-channel cadences (not just email).

### Multi-Touch Attribution

| Requirement | Attio | Zoho CRM |
|-------------|-------|----------|
| **Attribution tracking** | Limited — would need custom build | ✅ Google Ads integration, campaign tracking |
| **Campaign management** | Basic | ✅ Full campaigns module |

**Winner: Zoho** — Native campaign/attribution tools.

### Community/Subdivision Tracking

| Requirement | Attio | Zoho CRM |
|-------------|-------|----------|
| **Custom entities** | ✅ Custom Objects — create "Community", "Lot", "Floor Plan" objects | ✅ Custom Modules — similar capability |
| **Relationships** | ✅ Record reference attributes link objects | ✅ Lookup fields + related lists |
| **Hierarchy** | ✅ Flexible (object-to-object references) | ✅ Territory management could map to communities |

**Tie** — Both support custom data modeling. Attio's custom objects are slightly more flexible; Zoho's territory management could double as community assignment.

### Family/Household Relationship Management

| Requirement | Attio | Zoho CRM |
|-------------|-------|----------|
| **Contact-to-contact relationships** | ✅ Record reference attributes | ✅ Related contacts/accounts |
| **Household grouping** | Custom object needed | Custom module or Account-based |
| **Co-buyer tracking** | Custom implementation | Custom implementation |

**Tie** — Both require customization for household/family modeling. Neither has this out of the box.

### Integration with Homebuilder Tools

| Tool Type | Attio | Zoho CRM |
|-----------|-------|----------|
| **ERP (BuildPro, BuildTopia, etc.)** | API-based custom | API-based custom + marketplace potential |
| **Design Center** | Custom integration | Custom integration |
| **Construction Management** | Custom integration | Custom integration + Zoho Projects |
| **Marketing (Zillow, Realtor.com)** | Custom integration | More marketplace options |
| **Docusign/e-signatures** | API integration | Native integration available |

**Winner: Zoho** — Broader ecosystem, more pre-built integrations, Zoho's own suite (Projects, Books, Sign) can supplement.

### Overall Homebuilder Fit

**Neither platform is purpose-built for homebuilders.** Both require significant customization. However:
- **Attio** offers more flexible custom object modeling — easier to create bespoke homebuilder data structures
- **Zoho** offers more out-of-the-box sales features (territories, campaigns, CPQ) that translate well to homebuilding

---

## 5. Integration with HBx AI Agent Platform

### How HBx_SL1 (Schellie) Would Connect

#### Via Attio:
```
Schellie (HBx_SL1) ←→ MCP Protocol ←→ Attio MCP Server ←→ Attio CRM
                   ←→ REST API ←→ Attio Webhooks → HBx Event Bus
```
- **MCP Server** enables direct AI agent communication — Schellie can query, update, and manage records through natural language-like MCP calls
- **REST API** for structured CRUD operations
- **Webhooks** push real-time events to HBx (new lead, stage change, etc.)
- **App SDK** could embed HBx insights directly in Attio UI for human sales counselors

#### Via Zoho:
```
Schellie (HBx_SL1) ←→ Custom API Middleware ←→ Zoho CRM REST API v7
                   ←→ Zoho Notification API → HBx Event Bus
```
- Need custom middleware layer to translate between HBx agent actions and Zoho API
- OAuth token management (org-specific, environment-specific)
- Credit monitoring to avoid hitting limits
- Zoho Deluge functions could process some logic server-side

### Real-Time Data Push/Pull

| Capability | Attio | Zoho CRM |
|------------|-------|----------|
| **Real-time push (webhooks)** | ✅ Instant, signed, field-filtered | ✅ Notification APIs with channel expiry |
| **Real-time pull** | ✅ 100 req/sec reads | ✅ Credit-limited |
| **Agent-initiated updates** | ✅ 25 req/sec writes | ✅ Credit-limited |
| **Autonomous record updates** | ✅ API key with scoped permissions | ✅ OAuth with scoped access |

### Custom Field Support for Schell-Specific Data

Both platforms support extensive custom fields. Here's what we'd need:

| Custom Field | Attio Type | Zoho Type |
|--------------|------------|-----------|
| **Schellter™ Score** | Number attribute | Number field |
| **Energy Efficiency Rating** | Select/Rating attribute | Picklist/Number field |
| **Community** | Record Reference (to Community object) | Lookup (to Community module) |
| **Floor Plan** | Record Reference (to Floor Plan object) | Lookup (to Floor Plan module) |
| **Lot Number** | Text attribute | Text field |
| **Construction Stage** | Status attribute | Stage-probability mapping |
| **Estimated Completion** | Date attribute | Date field |
| **Buyer Preferences** | Custom object with multiple attributes | Subform or related module |
| **Design Selections** | Custom object | Subform |
| **Mortgage Status** | Select attribute | Picklist field |

**Verdict:** Both can model this. Attio's custom objects are more elegant for nested/complex data (buyer preferences, design selections). Zoho uses subforms and related modules which are functional but clunkier.

### HBx Integration Complexity Estimate

| Factor | Attio | Zoho CRM |
|--------|-------|----------|
| **Initial integration effort** | 2-3 weeks | 4-6 weeks |
| **MCP agent connection** | Days (native) | N/A (build custom) |
| **Webhook setup** | Hours | Hours |
| **Custom data model** | 1-2 weeks | 2-3 weeks |
| **Ongoing maintenance** | Low | Medium (token refresh, credit monitoring) |

---

## 6. Build-Our-Own Analysis

### What a Custom CRM Would Look Like

Using our Code Factory pipeline, we could build a CRM specifically designed for luxury homebuilder sales with deep AI integration.

**Tech Stack:**
- **Database:** PostgreSQL with JSONB for flexible schemas
- **API:** Node.js/TypeScript REST API (or GraphQL)
- **Frontend:** React/Next.js (or embedded in HBx dashboard)
- **Real-time:** WebSockets for live updates
- **AI Layer:** Direct integration with HBx agent framework
- **Auth:** JWT/OAuth2 with role-based access

**Core Modules to Build:**
1. Contact/Lead Management (people, households, relationships)
2. Community/Subdivision Management (communities, lots, floor plans, inventory)
3. Pipeline/Deal Management (multi-stage, long-cycle aware)
4. Activity Tracking (calls, emails, visits, events)
5. Task Management (follow-ups, to-dos)
6. Communication Hub (email integration, SMS, chat logs)
7. Reporting & Analytics (dashboards, funnel analysis)
8. Document Management (contracts, selections, specs)
9. AI Agent Interface (native HBx agent bus integration)
10. Admin & Permissions

### Effort Estimate

| Module | Effort | Complexity |
|--------|--------|------------|
| Data model & API foundation | 4-6 weeks | High |
| Contact/Lead management | 3-4 weeks | Medium |
| Pipeline/Deal management | 3-4 weeks | Medium |
| Community/Inventory tracking | 2-3 weeks | Medium |
| Activity tracking | 2-3 weeks | Medium |
| Email/Calendar integration | 4-6 weeks | High |
| Reporting & dashboards | 4-6 weeks | High |
| Search & filtering | 2-3 weeks | Medium |
| Permissions & admin | 2-3 weeks | Medium |
| AI agent interface | 1-2 weeks | Low (it's our platform) |
| Document management | 2-3 weeks | Medium |
| Import/Export/Migration | 2-3 weeks | Medium |
| Testing, QA, polish | 4-6 weeks | — |
| **Total MVP** | **~6-9 months** | — |
| **Feature parity with Attio/Zoho** | **18-24+ months** | — |

### Advantages of Building Our Own

1. **Perfectly tailored** to luxury homebuilder sales workflow
2. **Deep AI integration** — agents are first-class citizens, not API afterthoughts
3. **No per-seat licensing** — massive savings as team grows (Attio Pro × 20 users = $16,560/yr)
4. **Full data ownership** — no vendor lock-in, data stays in our infrastructure
5. **Custom UX** — designed exactly for Schell Brothers' workflow
6. **Schellter™ native** — energy specs, sustainability scores, design selections as core entities
7. **No rate limits** — our agents can query as much as needed
8. **Competitive moat** — proprietary CRM becomes part of the product

### Disadvantages of Building Our Own

1. **6-9 month MVP timeline** — delayed time to market
2. **Massive ongoing maintenance** — every feature, bug fix, security patch is on us
3. **No enrichment data** — Attio/Zoho auto-enrich contacts; we'd need to integrate Clearbit/Apollo separately
4. **No ecosystem** — no marketplace, no pre-built integrations
5. **Email/Calendar sync is brutally hard** — Google/Microsoft API complexity, deliverability management
6. **Mobile app** — additional platform to build and maintain
7. **Opportunity cost** — engineering time not spent on core HBx agent capabilities
8. **Data enrichment** — company/contact data providers cost $10K-50K+/yr
9. **Compliance/Security** — SOC2, data handling, all on us

### Features to "Steal" If Building Our Own

From **Attio:**
- Custom objects with flexible attribute types
- Record reference relationships (linking any object to any other)
- Communication intelligence (first/last interaction, connection strength)
- Historical attribute tracking (see values over time)
- AI Attributes concept (AI-generated fields that auto-update)
- MCP-style agent interface

From **Zoho:**
- Blueprint (guided sales process with enforced steps)
- Territory management (map to communities/subdivisions)
- Journey Orchestration (visual customer journey builder)
- Cadences (multi-channel sequences — email, SMS, calls)
- SalesSignals (real-time engagement notifications)
- CPQ concepts (floor plan pricing, option packages)
- Canvas (drag-and-drop UI customization for non-devs)

---

## 7. Recommendation

### Pros/Cons Matrix

| Factor | Attio | Zoho CRM | Build Our Own | Hybrid (Attio + Custom) |
|--------|-------|----------|---------------|------------------------|
| **Time to Market** | ⭐⭐⭐⭐⭐ (2-3 weeks) | ⭐⭐⭐⭐ (4-6 weeks) | ⭐ (6-9 months) | ⭐⭐⭐⭐ (4-6 weeks) |
| **AI Agent Integration** | ⭐⭐⭐⭐⭐ (MCP native) | ⭐⭐⭐ (API middleware) | ⭐⭐⭐⭐⭐ (native) | ⭐⭐⭐⭐⭐ (MCP + custom) |
| **Homebuilder Fit** | ⭐⭐⭐ (customize) | ⭐⭐⭐⭐ (more features) | ⭐⭐⭐⭐⭐ (purpose-built) | ⭐⭐⭐⭐⭐ (best of both) |
| **Cost (Year 1, ~10 users)** | ⭐⭐⭐ ($8,280-$10,320) | ⭐⭐⭐⭐⭐ ($1,680-$4,800) | ⭐⭐ (dev cost ~$150K+) | ⭐⭐⭐ ($8,280 + dev time) |
| **Cost (Year 3+)** | ⭐⭐⭐ (per-seat adds up) | ⭐⭐⭐⭐⭐ (cheapest) | ⭐⭐⭐⭐⭐ (no licensing) | ⭐⭐⭐⭐ (balanced) |
| **Scalability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (if well-built) | ⭐⭐⭐⭐ |
| **Data Enrichment** | ⭐⭐⭐⭐⭐ (built-in) | ⭐⭐⭐⭐ (via Zia) | ⭐ (must integrate separately) | ⭐⭐⭐⭐⭐ |
| **Maintenance Burden** | ⭐⭐⭐⭐⭐ (vendor manages) | ⭐⭐⭐⭐⭐ (vendor manages) | ⭐ (all on us) | ⭐⭐⭐⭐ (split) |
| **Vendor Risk** | ⭐⭐⭐ (startup, Series B) | ⭐⭐⭐⭐⭐ (profitable, 25+ yrs) | ⭐⭐⭐⭐⭐ (we own it) | ⭐⭐⭐ (Attio dependency) |
| **API Quality for AI Agents** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Reporting/Analytics** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ (must build) | ⭐⭐⭐⭐ |

### 🏆 Recommended: Option D — Hybrid (Attio + Custom HBx Modules)

**Why Attio over Zoho as the base:**
1. **MCP Server** — Our HBx agents can natively communicate with Attio. This is a massive advantage for an AI-agent-first platform. No middleware needed.
2. **Custom Objects** — Attio's data model is more flexible and modern. Creating "Community", "Floor Plan", "Lot", "Design Selection" objects is first-class.
3. **Developer Experience** — Cleaner API, simpler auth, better docs (including llms.txt for AI consumption).
4. **App SDK** — We can embed HBx agent insights directly into the CRM UI for sales counselors.
5. **AI-Native DNA** — Attio is building for the AI era. Their roadmap aligns with ours.
6. **Speed** — We can be integrated in 2-3 weeks vs 4-6 for Zoho.

**Why not Zoho:**
- Despite being cheaper and more feature-rich, Zoho's API is designed for traditional integrations, not AI agent orchestration
- Credit-based rate limiting is a constraint for autonomous agents that may need burst access
- OAuth complexity (org-specific, environment-specific tokens) adds maintenance overhead
- The ecosystem advantages (900+ integrations) matter less when we're building our own agent platform

**Why not Build-Our-Own (yet):**
- 6-9 month MVP delays our entire HBx platform launch
- Email/calendar sync alone is a multi-month project
- Data enrichment would cost $30K+/yr on top of dev costs
- Engineering resources should focus on HBx agent capabilities, not CRM infrastructure

**The Hybrid Approach:**

```
┌──────────────────────────────────────────────────┐
│                  HBx Platform                     │
│                                                   │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ Schellie │  │ Comp     │  │ Other HBx       │ │
│  │ (SL1)   │  │ Intel    │  │ Agents          │ │
│  └────┬────┘  └────┬─────┘  └────────┬────────┘ │
│       │             │                  │          │
│  ┌────▼─────────────▼──────────────────▼────────┐│
│  │           HBx Agent Bus / MCP Layer          ││
│  └────┬─────────────────────────────────┬───────┘│
│       │                                 │        │
│  ┌────▼──────────┐  ┌──────────────────▼──────┐ │
│  │   Attio CRM   │  │  Custom HBx Modules     │ │
│  │  (via MCP +   │  │  • Community Tracker     │ │
│  │   REST API)   │  │  • Schellter™ Specs      │ │
│  │               │  │  • Construction Stages   │ │
│  │  • Contacts   │  │  • Design Selections     │ │
│  │  • Companies  │  │  • Lot Inventory         │ │
│  │  • Deals      │  │  • Energy Dashboard      │ │
│  │  • Pipeline   │  │  • Buyer Journey Map     │ │
│  │  • Email Sync │  │                          │ │
│  │  • Enrichment │  │  (PostgreSQL + API)      │ │
│  │  • Reporting  │  │                          │ │
│  └───────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Phase 1 (Weeks 1-3): Core Attio Integration**
- Set up Attio workspace with custom objects (Community, Floor Plan, Lot)
- Connect HBx agents via MCP server
- Configure webhooks for real-time event streaming
- Set up custom fields for Schellter™ data

**Phase 2 (Weeks 4-8): Custom HBx Modules**
- Build homebuilder-specific modules in our Code Factory
- Construction stage tracker
- Design selection management
- Lot inventory with real-time availability
- Link these to Attio records via API

**Phase 3 (Weeks 9-12): AI Agent Optimization**
- Train Schellie to leverage full CRM context via MCP
- Build automated workflows (lead → pipeline → construction → close)
- Implement Schellter™ scoring as AI Attributes in Attio
- Set up reporting dashboards

**Phase 4 (Ongoing): Evaluate & Expand**
- Monitor if Attio's per-seat costs become prohibitive at scale
- Evaluate migrating more logic to custom modules if needed
- Consider full custom CRM only if Attio becomes a bottleneck (unlikely given their trajectory)

### Cost Projection (Hybrid Approach)

| Item | Year 1 | Year 2 | Year 3 |
|------|--------|--------|--------|
| Attio Pro (10 users, annual) | $8,280 | $8,280 | $8,280 |
| Attio additional credits | ~$1,000 | ~$1,500 | ~$2,000 |
| Custom module development | ~$20,000* | ~$5,000 | ~$5,000 |
| **Total** | **~$29,280** | **~$14,780** | **~$15,280** |

*Custom module dev cost assumes internal engineering time valued at market rate.

Compare to Zoho Enterprise (10 users): $4,800/yr but with significantly more integration development needed ($30-40K middleware + maintenance).

Compare to Build-Our-Own: $150K+ Year 1, $50K+/yr ongoing maintenance.

---

## Appendix A: Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Attio shuts down / acquired | Low (well-funded, $85M+) | High | Data export capabilities; custom modules are independent |
| Attio pricing increases | Medium | Medium | Lock annual contract; custom modules reduce dependency |
| Attio rate limits insufficient | Low | Medium | Custom modules handle high-frequency operations |
| Attio lacks homebuilder features | Expected | Low | Custom modules fill gaps by design |
| Integration complexity higher than estimated | Medium | Medium | Attio's MCP + clean API reduce this risk |

## Appendix B: Data Sources

- Attio pricing: https://attio.com/pricing (fetched 2026-02-22)
- Attio API docs: https://docs.attio.com (fetched 2026-02-22)
- Attio blog/announcements: https://attio.com/blog (fetched 2026-02-22)
- Zoho CRM pricing: https://www.zoho.com/crm/zohocrm-pricing.html (fetched 2026-02-22)
- Zoho CRM API docs: https://www.zoho.com/crm/developer/docs/api/v7/ (fetched 2026-02-22)
- Zoho CRM features: https://www.zoho.com/crm/features.html (fetched 2026-02-22)

---

*Report prepared by IN3 (Research Lab) for the HBx AI Agent Platform strategic planning process.*
