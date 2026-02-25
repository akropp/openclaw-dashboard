// WebSocket protocol types

export interface WsRequest {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface WsResponse {
  type: "res";
  id: string;
  ok?: boolean;
  payload?: unknown;
  result?: unknown;  // alias for payload
  error?: {
    code: number | string;
    message: string;
  };
}

export interface WsEvent {
  type: "evt";
  event: string;
  data: unknown;
}

export type WsMessage = WsRequest | WsResponse | WsEvent;

// Connection types

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface GatewayConfig {
  url: string;
  token: string;
}

// ---- Real API response types ----

// agents.list
export interface AgentIdentity {
  name?: string;
  theme?: string;
  emoji?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface GatewayAgentRow {
  id: string;
  name?: string;
  identity?: AgentIdentity;
}

export interface AgentsListResult {
  defaultId: string;
  mainKey: string;
  scope: string;
  agents: GatewayAgentRow[];
}

// sessions.list
export interface GatewaySessionRow {
  key: string;
  kind: "direct" | "group" | "global" | "unknown";
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  channel?: string;
  subject?: string;
  updatedAt: number | null;
  sessionId?: string;
  thinkingLevel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalTokensFresh?: boolean;
  modelProvider?: string;
  model?: string;
  contextTokens?: number;
  lastChannel?: string;
  lastTo?: string;
  lastAccountId?: string;
  sendPolicy?: "allow" | "deny";
}

export interface SessionsListDefaults {
  modelProvider: string | null;
  model: string | null;
  contextTokens: number | null;
}

export interface SessionsListResult {
  ts: number;
  path: string;
  count: number;
  defaults: SessionsListDefaults;
  sessions: GatewaySessionRow[];
}

// usage.status - provider usage summary (shape varies, treat as record)
export type UsageStatusResult = Record<string, unknown>;

// usage.cost
export interface UsageCostResult {
  [key: string]: unknown;
}

// models.list
export interface ModelCatalogEntry {
  id: string;
  name?: string;
  provider?: string;
  contextWindow?: number;
  maxTokens?: number;
  reasoning?: boolean;
  input?: string[];
  cost?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  api?: string;
}

export interface ModelsListResult {
  models: ModelCatalogEntry[];
}

// cron.list
export interface CronJobEntry {
  id: string;
  name?: string;
  schedule?: {
    kind: string;
    expr?: string;
    tz?: string;
    everyMs?: number;
    at?: string;
  };
  payload?: {
    kind: string;
    text?: string;
    message?: string;
    model?: string;
  };
  enabled?: boolean;
  sessionTarget?: string;
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastRunStatus?: string;
  lastRunDurationMs?: number;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface CronListResult {
  jobs: CronJobEntry[];
  total?: number;
  offset?: number;
  limit?: number;
}

// cron.status
export interface CronStatusResult {
  running: boolean;
  jobCount?: number;
  [key: string]: unknown;
}

// Generic activity/log types
export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  source?: string;
  data?: unknown;
}

// status API
export interface StatusSummary {
  heartbeat: {
    defaultAgentId: string;
    agents: Array<{
      agentId: string;
      enabled: boolean;
      every?: string;
      everyMs?: number;
    }>;
  };
  channelSummary: string[];
  queuedSystemEvents: string[];
  sessions: {
    count: number;
    defaults: {
      model: string | null;
      contextTokens: number | null;
    };
    byAgent: Array<{
      agentId: string;
      path: string;
      count: number;
      recent?: number;
    }>;
  };
}

// system-presence API
export interface SystemPresence {
  clients?: Array<{
    id: string;
    connId?: string;
    connectedAt?: number;
    lastActivityAt?: number;
    userAgent?: string;
  }>;
  [key: string]: unknown;
}
