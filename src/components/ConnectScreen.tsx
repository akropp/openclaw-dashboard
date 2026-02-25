import { useState } from "react";
import { useGatewayConfig } from "../api/hooks";

export function ConnectScreen() {
  const { configure } = useGatewayConfig();
  const [url, setUrl] = useState("wss://beelink2.tailcd0984.ts.net");
  const [token, setToken] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim() && token.trim()) {
      configure(url.trim(), token.trim());
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-0)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-lg font-bold text-white">
            OC
          </div>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">OpenClaw Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--color-text-3)] sm:text-base">
            Connect to your OpenClaw Gateway to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gateway-url" className="mb-1.5 block text-sm font-medium text-[var(--color-text-2)] sm:text-base">
              Gateway URL
            </label>
            <input
              id="gateway-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://localhost:18789"
              className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-white placeholder-[var(--color-text-3)] outline-none transition-colors focus:border-[var(--color-primary)] sm:text-base"
            />
          </div>

          <div>
            <label htmlFor="gateway-token" className="mb-1.5 block text-sm font-medium text-[var(--color-text-2)] sm:text-base">
              Auth Token
            </label>
            <input
              id="gateway-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your gateway token"
              className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-white placeholder-[var(--color-text-3)] outline-none transition-colors focus:border-[var(--color-primary)] sm:text-base"
            />
          </div>

          <button
            type="submit"
            disabled={!url.trim() || !token.trim()}
            className="min-h-[44px] w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dim)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
