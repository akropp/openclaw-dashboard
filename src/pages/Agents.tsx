import type { AgentsListResult, SessionsListResult, GatewaySessionRow } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card } from "../components/Card";
import { formatCompact } from "../utils/format";

function formatAge(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Agents() {
  const agentsReq = useRequest<AgentsListResult>("agents.list");
  const sessionsReq = useRequest<SessionsListResult>("sessions.list");

  const agents = agentsReq.data?.agents ?? [];
  const sessions = sessionsReq.data?.sessions ?? [];

  // Get sessions for an agent (excluding subagents)
  function sessionsForAgent(agentId: string): number {
    return sessions.filter(
      (s) => s.key.includes(`:${agentId}:`) && !s.key.includes(":subagent:")
    ).length;
  }

  // Get subagent sessions for an agent
  function subagentsForAgent(agentId: string): GatewaySessionRow[] {
    return sessions
      .filter((s) => {
        // Match pattern: agent:{agentId}:subagent:{uuid}
        const parts = s.key.split(":");
        return parts.length >= 4 && parts[1] === agentId && parts[2] === "subagent";
      })
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  if (agentsReq.loading && agents.length === 0) {
    return <div className="text-[var(--color-text-3)]">Loading agents…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Agents</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          All configured agents. Default: <span className="font-mono">{agentsReq.data?.defaultId ?? "—"}</span>
        </p>
      </div>

      {agentsReq.error && (
        <p className="text-sm text-red-400">{agentsReq.error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const count = sessionsForAgent(agent.id);
          const subagents = subagentsForAgent(agent.id);
          const isDefault = agent.id === agentsReq.data?.defaultId;
          
          return (
            <Card key={agent.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-[var(--color-text-1)]">
                    {agent.identity?.emoji ? `${agent.identity.emoji} ` : ""}
                    {agent.identity?.name ?? agent.name ?? agent.id}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--color-text-3)]">
                    {agent.id}
                  </p>
                </div>
                {isDefault && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                    default
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--color-text-3)]">
                <span>{count} session{count !== 1 ? "s" : ""}</span>
                {subagents.length > 0 && (
                  <span className="text-purple-400">{subagents.length} subagent{subagents.length !== 1 ? "s" : ""}</span>
                )}
                {agent.identity?.theme && (
                  <span>Theme: {agent.identity.theme}</span>
                )}
              </div>

              {/* Show active subagents */}
              {subagents.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-[var(--color-border)] pt-2">
                  <p className="text-xs font-medium text-[var(--color-text-3)]">Active Subagents:</p>
                  {subagents.slice(0, 5).map((sub) => (
                    <div
                      key={sub.key}
                      className="rounded bg-[var(--color-surface-2)] px-2 py-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[var(--color-text-2)]">
                          {sub.label ?? sub.displayName ?? "Subagent"}
                        </span>
                        <span className="text-[var(--color-text-3)]">
                          {formatAge(sub.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[var(--color-text-3)]">
                        {sub.model && (
                          <span className="font-mono">{sub.model}</span>
                        )}
                        {sub.totalTokens !== undefined && sub.totalTokens > 0 && (
                          <span>{formatCompact(sub.totalTokens)} tokens</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {subagents.length > 5 && (
                    <p className="text-xs text-[var(--color-text-3)]">
                      +{subagents.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
