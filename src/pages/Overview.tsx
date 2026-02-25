import type { AgentsListResult, SessionsListResult, GatewaySessionRow, GatewayAgentRow, StatusSummary, SystemPresence } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card, CardHeader } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { formatCompact } from "../utils/format";

// -----------------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  loading: boolean;
  error: string | null;
}

function StatCard({ label, value, loading, error }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-[var(--color-surface-2)]" />
      ) : error !== null ? (
        <p className="mt-3 text-sm text-red-400">—</p>
      ) : (
        <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--color-text-1)]">
          {value}
        </p>
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Agent fleet card
// -----------------------------------------------------------------------------

function AgentCard({ agent }: { agent: GatewayAgentRow }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-text-1)]">
            {agent.identity?.emoji ? `${agent.identity.emoji} ` : ""}
            {agent.identity?.name ?? agent.name ?? agent.id}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-3)]">
            {agent.id}
          </p>
        </div>
        <StatusBadge status="enabled" />
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Session row
// -----------------------------------------------------------------------------

function SessionRow({ session }: { session: GatewaySessionRow }) {
  const age = session.updatedAt
    ? formatAge(session.updatedAt)
    : "—";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-[var(--color-text-2)]">
          {session.displayName ?? session.label ?? session.key}
        </p>
        {session.lastMessagePreview && (
          <p className="mt-1 truncate text-xs text-[var(--color-text-3)]">
            {session.lastMessagePreview}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-3)]">
        {session.channel && (
          <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5">
            {session.channel}
          </span>
        )}
        {session.model && (
          <span className="font-mono">{session.model}</span>
        )}
        <span>{age}</span>
      </div>
    </div>
  );
}

function formatAge(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// -----------------------------------------------------------------------------
// Overview page
// -----------------------------------------------------------------------------

export default function Overview() {
  const sessionsReq = useRequest<SessionsListResult>("sessions.list", { includeLastMessage: true });
  const agentsReq = useRequest<AgentsListResult>("agents.list");
  const statusReq = useRequest<StatusSummary>("status");
  const presenceReq = useRequest<SystemPresence>("system-presence");

  const sessions = sessionsReq.data?.sessions ?? [];
  const agents = agentsReq.data?.agents ?? [];
  const status = statusReq.data;
  const presence = presenceReq.data;

  const activeSessions = sessions.filter(
    (s) => s.updatedAt && Date.now() - s.updatedAt < 30 * 60_000
  ).length;

  const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0);

  const recentSessions = [...sessions]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 10);

  const anyLoading = sessionsReq.loading || agentsReq.loading;
  const pageError = sessionsReq.error ?? agentsReq.error ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Overview</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          System-wide summary of agents, sessions, and usage.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Sessions"
          value={sessionsReq.data?.count ?? 0}
          loading={anyLoading && sessions.length === 0}
          error={sessionsReq.error}
        />
        <StatCard
          label="Active (30m)"
          value={activeSessions}
          loading={anyLoading && sessions.length === 0}
          error={sessionsReq.error}
        />
        <StatCard
          label="Agents"
          value={agents.length}
          loading={anyLoading && agents.length === 0}
          error={agentsReq.error}
        />
        <StatCard
          label="Total Tokens"
          value={formatCompact(totalTokens)}
          loading={anyLoading && sessions.length === 0}
          error={sessionsReq.error}
        />
      </div>

      {/* System Status */}
      {status && (
        <Card>
          <CardHeader title="System Status" />
          <div className="space-y-4">
            {/* Channels */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
                Connected Channels
              </p>
              <div className="flex flex-wrap gap-2">
                {status.channelSummary.length > 0 ? (
                  status.channelSummary.map((channel) => (
                    <span
                      key={channel}
                      className="rounded bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400"
                    >
                      {channel}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--color-text-3)]">No channels connected</span>
                )}
              </div>
            </div>

            {/* Heartbeat Status */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
                Heartbeat Status
              </p>
              <div className="space-y-1.5">
                {status.heartbeat.agents.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center justify-between rounded bg-[var(--color-surface-2)] px-3 py-2"
                  >
                    <span className="text-xs text-[var(--color-text-2)]">{agent.agentId}</span>
                    <div className="flex items-center gap-2">
                      {agent.every && (
                        <span className="font-mono text-xs text-[var(--color-text-3)]">
                          Every {agent.every}
                        </span>
                      )}
                      <StatusBadge status={agent.enabled ? "enabled" : "disabled"} />
                    </div>
                  </div>
                ))}
                {status.heartbeat.agents.length === 0 && (
                  <p className="text-xs text-[var(--color-text-3)]">No heartbeat agents configured</p>
                )}
              </div>
            </div>

            {/* Queued Events */}
            {status.queuedSystemEvents.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
                  Queued System Events
                </p>
                <div className="rounded bg-[var(--color-surface-2)] px-3 py-2">
                  <span className="text-xs text-[var(--color-text-2)]">
                    {status.queuedSystemEvents.length} event{status.queuedSystemEvents.length !== 1 ? 's' : ''} queued
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Connected Clients */}
      {presence && presence.clients && presence.clients.length > 0 && (
        <Card>
          <CardHeader
            title="Connected Clients"
            subtitle={`${presence.clients.length} client${presence.clients.length !== 1 ? 's' : ''} connected`}
          />
          <div className="space-y-2">
            {presence.clients.map((client) => (
              <div
                key={client.id}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-[var(--color-text-2)]">
                    {client.connId ?? client.id}
                  </span>
                  <span className="text-xs text-[var(--color-text-3)]">
                    {client.connectedAt ? formatAge(client.connectedAt) : "—"}
                  </span>
                </div>
                {client.userAgent && (
                  <p className="mt-1 truncate text-xs text-[var(--color-text-3)]">
                    {client.userAgent}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent fleet */}
      {agents.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-1)]">Agent Fleet</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-1)]">Recent Sessions</h2>
        {pageError && !anyLoading ? (
          <p className="text-sm text-red-400">{pageError}</p>
        ) : recentSessions.length === 0 && !anyLoading ? (
          <p className="text-sm text-[var(--color-text-3)]">No sessions found.</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <SessionRow key={session.key} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
