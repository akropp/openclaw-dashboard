import { Card } from "../components/Card";

export default function Logs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Logs</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          Live log tail — coming soon.
        </p>
      </div>

      <Card>
        <p className="text-sm text-[var(--color-text-3)]">
          Log streaming requires the <code className="font-mono text-[var(--color-text-2)]">logs.tail</code> WebSocket subscription.
          This will be implemented in a future update.
        </p>
      </Card>
    </div>
  );
}
