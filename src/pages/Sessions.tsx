import { useState } from "react";
import type { SessionsListResult, GatewaySessionRow } from "../api/types";
import { useRequest } from "../api/hooks";
import { formatCompact } from "../utils/format";

function formatAge(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function extractAgent(key: string): string {
  // session keys look like "agent:clawd:direct:adam"
  const parts = key.split(":");
  return parts.length >= 2 ? (parts[1] ?? "—") : "—";
}

function SessionRow({ session }: { session: GatewaySessionRow }) {
  const isSubagent = session.key.includes(":subagent:");
  
  return (
    <>
      {/* Desktop table row */}
      <tr className="hidden border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50 md:table-row">
        <td className="max-w-[300px] truncate py-3 font-mono text-xs text-[var(--color-text-2)]" style={{ paddingLeft: isSubagent ? '2rem' : '1rem' }}>
          <div className="flex items-center gap-2">
            {isSubagent && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-medium text-purple-400">
                subagent
              </span>
            )}
            <span className="truncate">
              {session.displayName ?? session.label ?? session.key}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-[var(--color-text-2)]">
          {extractAgent(session.key)}
        </td>
        <td className="px-4 py-3 text-xs">
          {session.channel && (
            <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[var(--color-text-3)]">
              {session.channel}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs">
          <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[var(--color-text-3)]">
            {session.kind}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-3)]">
          {session.model ?? "default"}
        </td>
        <td className="px-4 py-3 text-xs text-[var(--color-text-3)]">
          {formatAge(session.updatedAt)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-3)]">
          {formatCompact(session.totalTokens ?? 0)}
        </td>
      </tr>
      
      {/* Mobile card view */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0">
          <div className="border-b border-[var(--color-border)] p-3 hover:bg-[var(--color-surface-2)]/50">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isSubagent && (
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-medium text-purple-400">
                        subagent
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-sm text-[var(--color-text-2)]">
                    {session.displayName ?? session.label ?? session.key}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--color-text-3)]">
                  {formatAge(session.updatedAt)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-text-3)]">
                  <span className="text-[var(--color-text-3)]">Agent: </span>
                  {extractAgent(session.key)}
                </span>
                {session.channel && (
                  <span className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-text-3)]">
                    {session.channel}
                  </span>
                )}
                <span className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-text-3)]">
                  {session.kind}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-[var(--color-text-3)]">
                <span className="font-mono">{session.model ?? "default"}</span>
                <span className="font-mono">{formatCompact(session.totalTokens ?? 0)} tokens</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

export default function Sessions() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");

  const sessionsReq = useRequest<SessionsListResult>("sessions.list", {
    includeLastMessage: true,
    includeDerivedTitles: true,
  });

  const allSessions = sessionsReq.data?.sessions ?? [];

  // Extract unique channels and agents for filters
  const channels = [...new Set(allSessions.map((s) => s.channel).filter((c): c is string => Boolean(c)))];
  const agents = [...new Set(allSessions.map((s) => extractAgent(s.key)))];

  // Apply filters
  const sessions = allSessions.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.key.toLowerCase().includes(q) ||
        (s.displayName?.toLowerCase().includes(q) ?? false) ||
        (s.label?.toLowerCase().includes(q) ?? false) ||
        (s.lastMessagePreview?.toLowerCase().includes(q) ?? false);
      if (!match) return false;
    }
    if (channelFilter && s.channel !== channelFilter) return false;
    if (agentFilter && extractAgent(s.key) !== agentFilter) return false;
    return true;
  });

  // Sort by most recent
  const sorted = [...sessions].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Sessions</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          {sessionsReq.data?.count ?? 0} total sessions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          type="text"
          placeholder="Search sessions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-blue-500 focus:outline-none sm:flex-initial"
        />
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-2)]"
        >
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-2)]"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {sessionsReq.error && (
        <p className="text-sm text-red-400">{sessionsReq.error}</p>
      )}

      {/* Table - desktop, Cards - mobile */}
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full">
          <thead>
            <tr className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-2)] md:table-row">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Session</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Agent</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Channel</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Kind</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Model</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Activity</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-3)]">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((session) => (
              <SessionRow key={session.key} session={session} />
            ))}
            {sorted.length === 0 && !sessionsReq.loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--color-text-3)]">
                  No sessions match filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
