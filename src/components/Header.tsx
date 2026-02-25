import { useEffect, useState } from "react";
import { useConnectionStatus, useWebSocket } from "../api/hooks";
import { StatusBadge } from "./StatusBadge";
import { formatDuration } from "../utils/format";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const status = useConnectionStatus();
  const ws = useWebSocket();
  
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [uptime, setUptime] = useState<string>("—");
  const [restarting, setRestarting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch gateway version from config on connect
  useEffect(() => {
    if (status !== "connected") return;

    ws.request<{ version?: string }>("config.get", {})
      .then((config) => {
        if (config.version) {
          setGatewayVersion(config.version);
        }
      })
      .catch(() => {
        // Fallback: try to get from gateway info if available
        setGatewayVersion(null);
      });

    // Track connection time for uptime calculation
    setConnectedAt(Date.now());
  }, [status, ws]);

  // Update uptime every second
  useEffect(() => {
    if (!connectedAt) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - connectedAt;
      setUptime(formatDuration(elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [connectedAt]);

  const handleRestart = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setRestarting(true);
    setShowConfirm(false);

    try {
      await ws.request("config.patch", { raw: "{}" });
    } catch (err) {
      console.error("Restart failed:", err);
    }

    // Keep button disabled for 10 seconds
    setTimeout(() => {
      setRestarting(false);
    }, 10000);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger menu button - only visible on mobile */}
        <button
          onClick={onMobileMenuToggle}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-2)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="text-xs text-[var(--color-text-3)] sm:text-sm">
            <span className="hidden sm:inline">OpenClaw Gateway Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </div>
          {gatewayVersion && (
            <div className="text-xs text-[var(--color-text-3)]">
              v{gatewayVersion}
            </div>
          )}
          {status === "connected" && (
            <div className="hidden text-xs text-[var(--color-text-3)] sm:block">
              Uptime: {uptime}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {status === "connected" && (
          <div className="relative">
            {showConfirm ? (
              <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="hidden text-xs text-[var(--color-text-3)] sm:inline">Confirm restart?</span>
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={handleRestart}
                    className="min-h-[44px] rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 sm:px-3"
                  >
                    <span className="hidden sm:inline">Yes, Restart</span>
                    <span className="sm:hidden">Yes</span>
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="min-h-[44px] rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs font-medium text-[var(--color-text-2)] hover:bg-[var(--color-surface-3)] sm:px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRestart}
                disabled={restarting}
                className="min-h-[44px] rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs font-medium text-[var(--color-text-2)] hover:bg-[var(--color-surface-3)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
              >
                <span className="hidden sm:inline">{restarting ? "Restarting..." : "Restart Gateway"}</span>
                <span className="sm:hidden">{restarting ? "..." : "Restart"}</span>
              </button>
            )}
          </div>
        )}
        <StatusBadge status={status} />
      </div>
    </header>
  );
}
