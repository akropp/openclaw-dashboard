import { classNames } from "../utils/format";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const STATUS_COLORS: Record<string, string> = {
  // Connection
  connected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  connecting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reconnecting: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  disconnected: "bg-red-500/20 text-red-400 border-red-500/30",
  // Session/Agent
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  idle: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  archived: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  // Heartbeat
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  stale: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  missing: "bg-red-500/20 text-red-400 border-red-500/30",
  // Cron
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failure: "bg-red-500/20 text-red-400 border-red-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  enabled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  disabled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const DEFAULT_COLOR = "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? DEFAULT_COLOR;

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border font-medium capitalize",
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      )}
    >
      <span
        className={classNames(
          "mr-1.5 rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          status === "connected" || status === "active" || status === "healthy" || status === "success" || status === "enabled"
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            : status === "idle" || status === "stale" || status === "reconnecting" || status === "connecting"
              ? "bg-amber-400"
              : status === "running"
                ? "bg-blue-400 animate-pulse"
                : "bg-current opacity-50"
        )}
      />
      {status}
    </span>
  );
}
