import type { UsageStatusResult, SessionsListResult } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card } from "../components/Card";
import { formatCompact } from "../utils/format";

function extractAgent(key: string): string {
  const parts = key.split(":");
  return parts.length >= 2 ? (parts[1] ?? "unknown") : "unknown";
}

export default function Usage() {
  const usageReq = useRequest<UsageStatusResult>("usage.status");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Usage & Costs</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          Token usage across all sessions.
        </p>
      </div>

      {(usageReq.error ?? sessionsReq.error) && (
        <p className="text-sm text-red-400">{usageReq.error ?? sessionsReq.error}</p>
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

      {/* Raw provider usage */}
      {usageReq.data && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-1)]">Provider Usage (Raw)</h2>
          <Card>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--color-text-3)]">
              {JSON.stringify(usageReq.data, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}
