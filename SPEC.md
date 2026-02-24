# OpenClaw Dashboard — Build Spec

## What You're Building

A monitoring dashboard for OpenClaw — an AI agent orchestration platform. This is a standalone web app that connects to the OpenClaw Gateway's WebSocket API to display real-time status of agents, sessions, usage, cron jobs, models, and system health.

**Target audience:** Power users running multi-agent OpenClaw setups (multiple AI agents, multiple chat channels, cron jobs, subagent orchestration).

## Architecture

### Stack
- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** for styling
- **Recharts** for charts/graphs
- **No backend** — the OpenClaw Gateway IS the backend. The dashboard connects directly via WebSocket.

### How It Connects

The OpenClaw Gateway runs on port 18789 and serves:
1. An HTTP server (for the built-in control UI and health checks)
2. A WebSocket server (JSON-RPC style API)

**WebSocket connection:**
```
ws://<host>:18789/
```

**Authentication:** On connect, send:
```json
{
  "type": "req",
  "id": "connect-1",
  "method": "connect",
  "params": {
    "auth": { "token": "<gateway-token>" },
    "client": { "name": "openclaw-dashboard", "version": "1.0.0", "mode": "control" }
  }
}
```

The gateway responds with a connect acknowledgment. After that, you can call methods.

**Request/Response pattern:**
```json
// Request
{ "type": "req", "id": "unique-id", "method": "sessions.list", "params": {} }

// Response  
{ "type": "res", "id": "unique-id", "result": { ... } }

// Error
{ "type": "res", "id": "unique-id", "error": { "code": -32000, "message": "..." } }
```

**Server-push events** also come through the WebSocket (agent events, presence changes, etc.):
```json
{ "type": "evt", "event": "agent-event", "data": { ... } }
```

### Available API Methods

These are the WebSocket JSON-RPC methods the gateway exposes:

**Sessions:**
- `sessions.list` → List all sessions with metadata (agent, channel, status, timestamps, model, token counts)
- `sessions.preview` → Get recent messages for a session
- `sessions.usage` → Aggregated usage stats across sessions

**Usage & Cost:**
- `usage.status` → Current usage status (tokens, costs, rate limits)  
- `usage.cost` → Cost breakdown by model/day/session
- `sessions.usage.timeseries` → Time-series usage data for charts

**Agents:**
- `agents.list` → List configured agents with their settings

**Models:**
- `models.list` → Available models across all providers (with pricing, context window, capabilities)

**Cron:**
- `cron.list` → All cron jobs with schedule, last run, enabled status
- `cron.status` → Cron scheduler status
- `cron.runs` → Run history for a specific job
- `cron.run` → Manually trigger a job
- `cron.update` → Enable/disable a job

**System:**
- `last-heartbeat` → Last heartbeat timestamp per agent
- `system-presence` → Connected clients/instances
- `logs.tail` → Live log tail with filtering

**Config:**
- `config.get` → Current gateway configuration
- `config.schema` → Configuration JSON schema

**Health:**
- HTTP GET to `http://<host>:18789/` returns the control UI (we're replacing this)

## Dashboard Pages/Panels

### 1. Overview (Landing Page)
- **System status card** — Gateway uptime, version, host info
- **Agent fleet status** — All agents with online/idle/offline indicators and last heartbeat
- **Active sessions count** — Total, active (recent activity), idle
- **Token burn rate** — Tokens/hour over last 24h (sparkline)
- **Cost today/this week/this month** — Quick cost summary
- **Recent activity feed** — Last 10-15 session events across all agents

### 2. Agents
- **Agent cards** for each configured agent (clawd, gilfoyle, monty, sterling, etc.)
- Per agent: current model, active sessions, total tokens used today, last heartbeat time, heartbeat status (healthy/stale/missing)
- Click into an agent to see its sessions

### 3. Sessions
- **Filterable table/list** of all sessions
- Columns: Session key, Agent, Channel, Status (active/idle/archived), Model, Last activity, Token count, Cost
- Filters: by agent, by channel (telegram/discord/signal), by status, search by session key
- Click a session to see: last messages preview, usage breakdown, model used
- Highlight subagent sessions differently (indented or tagged)

### 4. Usage & Costs
- **Cost over time** — Line/area chart: daily cost for last 30 days
- **Cost by model** — Pie/donut chart showing spend per model (Claude Opus, Sonnet, GPT-4, etc.)
- **Cost by agent** — Bar chart showing which agent burns the most
- **Token usage** — Input vs output vs cache-read tokens over time
- **Top sessions by cost** — Table of most expensive sessions
- **Rate limit status** — Current usage vs limits for each provider

### 5. Cron Jobs
- **Job list** with: name, schedule (human readable), last run time, last run status (success/fail), next estimated run, enabled toggle
- **Run history** — Click a job to see recent runs with duration and outcome
- **Manual trigger** button per job
- Enable/disable toggle per job

### 6. Models
- **Available models** grouped by provider (Anthropic, OpenAI, Google, etc.)
- Per model: name, context window, pricing (input/output per 1M tokens), capabilities
- Which agents are currently using which model
- Highlight the default model

### 7. Logs (stretch goal)
- Live tail of gateway logs
- Filter by level (info/warn/error)
- Auto-scroll with pause button

## Design Requirements

### Visual Style
- **Dark theme** — Dark backgrounds (#0a0a0f / #111118 range), subtle borders, glassmorphic cards
- **Color palette:** 
  - Primary: Electric blue (#3b82f6) 
  - Accent: Emerald (#10b981) for healthy/success
  - Warning: Amber (#f59e0b)
  - Error: Red (#ef4444)
  - Text: White/gray hierarchy (#ffffff, #a1a1aa, #71717a)
- **Cards** with subtle borders, slight backdrop blur, rounded corners
- **Smooth transitions** on state changes
- **Monospace font** for session keys, model names, technical data
- **Sans-serif** (Inter or system) for labels and headings

### Layout
- **Sidebar navigation** — collapsible, with icons + labels
- **Responsive** — works on desktop (primary) and tablet
- **Header** — shows connection status (connected/disconnected/reconnecting), gateway version

### Data Refresh
- WebSocket is persistent — data updates in real-time via push events
- Polling fallback: refresh key data every 30 seconds if no push events
- Show "last updated" timestamps on cards
- Visual indicator when data is stale (>60s without update)

## Project Structure

```
openclaw-dashboard/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── websocket.ts      # WebSocket client, reconnection, auth
│   │   ├── types.ts           # API response types
│   │   └── hooks.ts           # React hooks for data fetching
│   ├── components/
│   │   ├── Layout.tsx         # Sidebar + header + content area
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ... shared UI components
│   ├── pages/
│   │   ├── Overview.tsx
│   │   ├── Agents.tsx
│   │   ├── Sessions.tsx
│   │   ├── Usage.tsx
│   │   ├── CronJobs.tsx
│   │   ├── Models.tsx
│   │   └── Logs.tsx
│   └── utils/
│       ├── format.ts          # Number/date/token formatting
│       └── constants.ts
├── public/
│   └── favicon.svg
└── README.md
```

## Configuration

The dashboard needs to know:
1. **Gateway URL** — `ws://hostname:18789` (configurable, with localStorage persistence)
2. **Auth token** — Gateway bearer token (stored in localStorage, prompted on first visit)

Show a clean connection/setup screen if not configured.

## Build & Deploy

```bash
npm install
npm run dev      # Development server with HMR
npm run build    # Production build to dist/
```

The production build should be a static site that can be:
1. Served by any static file server
2. Dropped into the OpenClaw gateway's static file serving (future)
3. Run locally with `npx serve dist/`

## What NOT to Build

- No auth system (PBKDF2, TOTP, etc.) — the gateway token is sufficient, and this runs behind Tailscale
- No backend server — pure client-side SPA
- No file system access — all data comes from the WebSocket API
- No message sending — this is read-only monitoring (for now)
- No mobile-first design — desktop is primary, just don't break on tablets

## Quality Bar

- TypeScript strict mode
- Clean component decomposition
- Proper error boundaries
- Loading states for all async data
- Graceful WebSocket reconnection with exponential backoff
- No `any` types
- Semantic HTML

## Model Usage Instructions

**IMPORTANT:** Use Claude Opus (claude-opus-4-6) for any architectural planning, complex design decisions, or debugging. Use Claude Sonnet (claude-sonnet-4-5) for straightforward implementation/coding tasks. You can switch models mid-session with `/model`. Plan first in Opus, then switch to Sonnet for the grind.

## Reference

The existing community dashboard for inspiration (but we're building better):
https://github.com/tugcantopaloglu/openclaw-dashboard

OpenClaw source (for API reference):
- WebSocket methods: grep for `Handlers:` in `/home/clawd/openclaw-fork/src/gateway/server-methods/*.ts`
- Session types: `/home/clawd/openclaw-fork/src/config/sessions.ts` and `sessions/types.ts`
- Usage types: `/home/clawd/openclaw-fork/src/infra/session-cost-usage.ts`
- Protocol types: `/home/clawd/openclaw-fork/src/gateway/protocol/`
