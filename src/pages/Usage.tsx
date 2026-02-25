import type { SessionsListResult, ProviderUsageResult, ProviderUsageEntry } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card } from "../components/Card";
import { formatCompact } from "../utils/format";

function extractAgent(key: string): string {
  const parts = key.split(":");
  return parts.length >= 2 ? (parts[1] ?? "unknown") : "unknown";
}

// ---------------------------------------------------------------------------
// Provider icon (text-based badge)
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  anthropic: { label: "Anthropic", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  openrouter: { label: "OpenRouter", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  moonshot: { label: "Moonshot", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  huggingface: { label: "HuggingFace", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
};

function providerMeta(name: string) {
  return (
    PROVIDER_META[name.toLowerCase()] ??
    { label: name, color: "bg-[var(--color-surface-2)] text-[var(--color-text-2)] border-[var(--color-border)]" }
  );
}

// ---------------------------------------------------------------------------
// ProviderCard
// ---------------------------------------------------------------------------

function ProviderCard({ entry }: { entry: ProviderUsageEntry }) {
  const meta = providerMeta(entry.provider);

  return (
    <Card className="flex flex-col gap-4">
      {/* Provider header */}
      <div className="flex items-center gap-3">
        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.color}`}
        >
          {meta.label}
        </span>
        {entry.error && (
          <span className="ml-auto rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
            Error
          </span>
        )}
      </div>

      {/* Error state */}
      {entry.error && (
        <p className="text-xs text-red-400">{entry.error}</p>
      )}

      {/* Credits */}
      {(entry.creditsUsed != null || entry.creditsRemaining != null) && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
            Credits
          </p>
          <div className="grid grid-cols-2 gap-2">
            {entry.creditsUsed != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Used</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-[var(--color-text-1)]">
                  {formatCompact(entry.creditsUsed)}
                </p>
              </div>
            )}
            {entry.creditsRemaining != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Remaining</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-emerald-400">
                  {formatCompact(entry.creditsRemaining)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token usage */}
      {(entry.inputTokens != null || entry.outputTokens != null || entry.totalTokens != null) && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
            Tokens
          </p>
          <div className="grid grid-cols-3 gap-2">
            {entry.inputTokens != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Input</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-blue-400">
                  {formatCompact(entry.inputTokens)}
                </p>
              </div>
            )}
            {entry.outputTokens != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Output</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-emerald-400">
                  {formatCompact(entry.outputTokens)}
                </p>
              </div>
            )}
            {entry.totalTokens != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Total</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-[var(--color-text-1)]">
                  {formatCompact(entry.totalTokens)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quota */}
      {entry.quota && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">
            Quota
          </p>
          <div className="grid grid-cols-2 gap-2">
            {entry.quota.limit != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Limit</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-[var(--color-text-1)]">
                  {formatCompact(entry.quota.limit)}
                </p>
              </div>
            )}
            {entry.quota.used != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Used</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-[var(--color-text-1)]">
                  {formatCompact(entry.quota.used)}
                </p>
              </div>
            )}
            {entry.quota.remaining != null && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Remaining</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-emerald-400">
                  {formatCompact(entry.quota.remaining)}
                </p>
              </div>
            )}
            {entry.quota.resetAt && (
              <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--color-text-3)]">Resets</p>
                <p className="mt-0.5 text-xs font-medium text-[var(--color-text-2)]">
                  {new Date(entry.quota.resetAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no data and no error */}
      {!entry.error &&
        entry.creditsUsed == null &&
        entry.creditsRemaining == null &&
        entry.inputTokens == null &&
        entry.outputTokens == null &&
        entry.totalTokens == null &&
        !entry.quota && (
          <p className="text-xs text-[var(--color-text-3)]">No usage data available.</p>
        )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Usage page
// ---------------------------------------------------------------------------

export default function Usage() {
  const providerReq = useRequest<ProviderUsageResult>("provider.usage");
  const sessionsReq = useRequest<SessionsListResult>("sessions.list");

  const sessions = sessionsReq.data?.sessions ?? [];

  // Aggregate tokens by agent
  const byAgent = new Map<string, { input: number; output: number; total: number }>();
  for (const s of sessions) {
    const agent = extractAgent(s.key);
    const prev = byAgent.get(agent) ?? { input: 0, output: 0, total: 0 };
    byAgent.set(agent, {
      input: prev.input + (s.inputTokens ?? 0),
      output: prev.output + (s.outputTokens ?? 0),
      total: prev.total + (s.totalTokens ?? 0),
    });
  }

  // Aggregate tokens by model
  const byModel = new Map<string, number>();
  for (const s of sessions) {
    const model = s.model ?? "default";
    byModel.set(model, (byModel.get(model) ?? 0) + (s.totalTokens ?? 0));
  }

  const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0);
  const totalInput = sessions.reduce((sum, s) => sum + (s.inputTokens ?? 0), 0);
  const totalOutput = sessions.reduce((sum, s) => sum + (s.outputTokens ?? 0), 0);

  const providers = providerReq.data?.providers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Usage & Costs</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          Token usage across all sessions.
        </p>
      </div>

      {sessionsReq.error && (
        <p className="text-sm text-red-400">{sessionsReq.error}</p>
      )}

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Total Tokens</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--color-text-1)]">{formatCompact(totalTokens)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Input Tokens</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-blue-400">{formatCompact(totalInput)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-3)]">Output Tokens</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-400">{formatCompact(totalOutput)}</p>
        </Card>
      </div>

      {/* Usage by agent */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-1)]">By Agent</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Agent</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--color-text-3)]">Input</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--color-text-3)]">Output</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--color-text-3)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...byAgent.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([agent, usage]) => (
                  <tr key={agent} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-mono text-sm text-[var(--color-text-2)]">{agent}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-3)]">{formatCompact(usage.input)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-3)]">{formatCompact(usage.output)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-1)]">{formatCompact(usage.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage by model */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-1)]">By Model</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--color-text-3)]">Model</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--color-text-3)]">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[...byModel.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([model, tokens]) => (
                  <tr key={model} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-mono text-sm text-[var(--color-text-2)]">{model}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-1)]">{formatCompact(tokens)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider Usage */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-1)]">Provider Usage</h2>
          {providerReq.error && (
            <span className="text-xs text-red-400">{providerReq.error}</span>
          )}
        </div>

        {/* Loading state */}
        {providerReq.loading && providers.length === 0 && (
          <p className="text-sm text-[var(--color-text-3)]">Loading provider data…</p>
        )}

        {/* No providers returned */}
        {!providerReq.loading && !providerReq.error && providers.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--color-text-3)]">No provider usage data available.</p>
          </Card>
        )}

        {/* Provider cards grid */}
        {providers.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            {providers.map((entry) => (
              <ProviderCard key={entry.provider} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
