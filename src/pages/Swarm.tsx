import { useState, useEffect, useCallback } from "react";
import { useRequest, useEvents, useWebSocket } from "../api/hooks";
import { Card } from "../components/Card";
import type { SwarmListResult, SwarmTask, SwarmLogsResult } from "../api/types";
import { formatRelativeTime, classNames } from "../utils/format";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function taskStatusColor(task: SwarmTask): string {
  if (task.status === "done" && task.ciPassed) return "text-emerald-400";
  if (task.status === "done") return "text-green-400";
  if (task.status === "running") return "text-yellow-400";
  if (task.status === "failed") return "text-red-400";
  return "text-[var(--color-text-3)]";
}

function taskRowBg(task: SwarmTask): string {
  if (task.status === "failed") return "bg-red-500/5";
  if (task.status === "running") return "bg-yellow-500/5";
  return "";
}

function StatusDot({ task }: { task: SwarmTask }) {
  if (task.status === "running") {
    return (
      <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-yellow-400" />
    );
  }
  if (task.status === "done" && task.ciPassed) {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />;
  }
  if (task.status === "done") {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-400" />;
  }
  if (task.status === "failed") {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-400" />;
  }
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gray-500" />;
}

function AgentBadge({ agent }: { agent: string }) {
  const colors: Record<string, string> = {
    codex: "bg-purple-500/20 text-purple-300",
    claude: "bg-orange-500/20 text-orange-300",
    gemini: "bg-blue-500/20 text-blue-300",
  };
  const cls = colors[agent.toLowerCase()] ?? "bg-[var(--color-surface-2)] text-[var(--color-text-2)]";
  return (
    <span className={classNames("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      {agent}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Logs Modal
// ---------------------------------------------------------------------------

interface LogsModalProps {
  taskId: string;
  onClose: () => void;
}

function LogsModal({ taskId, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  let ws: ReturnType<typeof useWebSocket> | null = null;
  try {
    ws = useWebSocket();
  } catch {
    // ws unavailable
  }

  useEffect(() => {
    if (!ws) {
      setError("Not connected");
      return;
    }
    ws.request<SwarmLogsResult>("swarm.logs", { id: taskId })
      .then((result) => setLogs(result.logs ?? ""))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-1)]">Task Logs</h3>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-3)]">{taskId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-3)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {logs === null && !error && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-3)]">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading logs...
            </div>
          )}
          {logs !== null && (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-text-2)]">
              {logs || "(no output)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Swarm page
// ---------------------------------------------------------------------------

export default function Swarm() {
  const swarmReq = useRequest<SwarmListResult>("swarm.list");

  let ws: ReturnType<typeof useWebSocket> | null = null;
  try {
    ws = useWebSocket();
  } catch {
    // ws unavailable
  }

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [logsTaskId, setLogsTaskId] = useState<string | null>(null);
  const [killingId, setKillingId] = useState<string | null>(null);
  const [killError, setKillError] = useState<string | null>(null);

  // Real-time updates via WebSocket events
  useEvents("swarm.task.updated", () => swarmReq.refetch());
  useEvents("swarm.task.created", () => swarmReq.refetch());
  useEvents("swarm.task.done", () => swarmReq.refetch());

  const tasks = swarmReq.data?.tasks ?? [];

  // Unique agent types for filter dropdown
  const agents = [...new Set(tasks.map((t) => t.agent))].sort();

  // Apply filters
  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (agentFilter !== "all" && t.agent !== agentFilter) return false;
    return true;
  });

  const handleKill = useCallback(
    async (task: SwarmTask) => {
      if (!confirm(`Kill task ${task.id.slice(0, 8)}? This will terminate the running agent.`)) {
        return;
      }
      if (!ws) {
        setKillError("Not connected");
        return;
      }
      setKillingId(task.id);
      setKillError(null);
      try {
        await ws.request("swarm.kill", { id: task.id });
        swarmReq.refetch();
      } catch (err: unknown) {
        setKillError(err instanceof Error ? err.message : String(err));
      } finally {
        setKillingId(null);
      }
    },
    [ws, swarmReq]
  );

  // Summary counts
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Coder Swarm</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          Monitor and manage agent swarm tasks.
        </p>
      </div>

      {/* Error banners */}
      {swarmReq.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {swarmReq.error}
        </p>
      )}
      {killError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Kill failed: {killError}
        </p>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Running</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-yellow-400">{runningCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Done</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-400">{doneCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Failed</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-red-400">{failedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-3)]">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-1)]"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--color-text-3)]">Agent</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-1)]"
            >
              <option value="all">All</option>
              {agents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => swarmReq.refetch()}
          disabled={swarmReq.loading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-2)] transition-colors hover:text-white disabled:opacity-50"
        >
          <svg
            className={classNames("h-3.5 w-3.5", swarmReq.loading ? "animate-spin" : "")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <span className="ml-auto text-xs text-[var(--color-text-3)]">
          {filtered.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !swarmReq.loading && (
        <Card>
          <p className="text-sm text-[var(--color-text-3)]">
            {tasks.length === 0 ? "No swarm tasks found." : "No tasks match the current filters."}
          </p>
        </Card>
      )}

      {/* Tasks table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Repo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Completed</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">PR#</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  killingId={killingId}
                  onKill={handleKill}
                  onViewLogs={setLogsTaskId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logs Modal */}
      {logsTaskId && (
        <LogsModal taskId={logsTaskId} onClose={() => setLogsTaskId(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskRow (extracted to keep JSX cleaner)
// ---------------------------------------------------------------------------

interface TaskRowProps {
  task: SwarmTask;
  killingId: string | null;
  onKill: (task: SwarmTask) => void;
  onViewLogs: (id: string) => void;
}

function TaskRow({ task, killingId, onKill, onViewLogs }: TaskRowProps) {
  const prLink = task.prUrl ?? (
    typeof task.pr === "string" && task.pr.startsWith("http") ? task.pr : null
  );

  const copyWorktree = () => {
    if (task.worktreePath) {
      void navigator.clipboard.writeText(task.worktreePath).catch(() => {/* ignore */});
    }
  };

  return (
    <tr
      className={classNames(
        "border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-2)]/50",
        taskRowBg(task)
      )}
    >
      {/* ID */}
      <td className="px-4 py-3">
        <span
          className="cursor-default font-mono text-xs text-[var(--color-text-3)]"
          title={task.id}
        >
          {task.id.slice(0, 8)}
        </span>
      </td>

      {/* Agent */}
      <td className="px-4 py-3">
        <AgentBadge agent={task.agent} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot task={task} />
          <span className={classNames("text-xs font-medium capitalize", taskStatusColor(task))}>
            {task.status}
            {task.status === "done" && task.ciPassed && (
              <span className="ml-1 text-emerald-500">✓CI</span>
            )}
          </span>
        </div>
      </td>

      {/* Repo */}
      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-2)]">
        {task.repo ?? <span className="text-[var(--color-text-3)]">—</span>}
      </td>

      {/* Description */}
      <td className="max-w-xs px-4 py-3">
        <p className="truncate text-sm text-[var(--color-text-2)]" title={task.description}>
          {task.description ?? <span className="text-[var(--color-text-3)]">—</span>}
        </p>
      </td>

      {/* Started */}
      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-3)]">
        {task.startedAt ? formatRelativeTime(task.startedAt) : "—"}
      </td>

      {/* Completed */}
      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-3)]">
        {task.completedAt ? formatRelativeTime(task.completedAt) : "—"}
      </td>

      {/* PR# */}
      <td className="px-4 py-3 text-xs">
        {task.pr != null ? (
          prLink ? (
            <a
              href={prLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
            >
              #{task.pr}
            </a>
          ) : (
            <span className="text-[var(--color-text-2)]">#{task.pr}</span>
          )
        ) : (
          <span className="text-[var(--color-text-3)]">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* View Logs */}
          <button
            onClick={() => onViewLogs(task.id)}
            className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-2)] transition-colors hover:text-white"
          >
            Logs
          </button>

          {/* Open Worktree */}
          {task.worktreePath && (
            <button
              onClick={copyWorktree}
              title={`Copy path: ${task.worktreePath}`}
              className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-2)] transition-colors hover:text-white"
            >
              Worktree
            </button>
          )}

          {/* View PR */}
          {prLink && (
            <a
              href={prLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
            >
              PR
            </a>
          )}

          {/* Kill — only for running tasks */}
          {task.status === "running" && (
            <button
              onClick={() => onKill(task)}
              disabled={killingId === task.id}
              className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {killingId === task.id ? "Killing…" : "Kill"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
