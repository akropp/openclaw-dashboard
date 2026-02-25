import type { ModelsListResult, ModelCatalogEntry } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card } from "../components/Card";

function formatCost(cost: number): string {
  if (cost === 0) return "Free";
  return `$${cost.toFixed(2)}`;
}

function ModelCard({ model }: { model: ModelCatalogEntry }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-text-1)]">
            {model.name ?? model.id}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-3)]">
            {model.provider ? `${model.provider}/${model.id}` : model.id}
          </p>
        </div>
        {model.reasoning && (
          <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
            reasoning
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-3)]">
        {model.contextWindow && (
          <span>ctx: {(model.contextWindow / 1000).toFixed(0)}K</span>
        )}
        {model.maxTokens && (
          <span>max: {(model.maxTokens / 1000).toFixed(0)}K</span>
        )}
        {model.cost && (
          <span>
            {formatCost(model.cost.input)}/{formatCost(model.cost.output)} per 1M
          </span>
        )}
      </div>

      {model.input && model.input.length > 0 && (
        <div className="flex gap-1">
          {model.input.map((cap) => (
            <span
              key={cap}
              className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs text-[var(--color-text-3)]"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Models() {
  const modelsReq = useRequest<ModelsListResult>("models.list");
  const models = modelsReq.data?.models ?? [];

  // Group by provider
  const byProvider = new Map<string, ModelCatalogEntry[]>();
  for (const model of models) {
    const provider = model.provider ?? "unknown";
    const list = byProvider.get(provider) ?? [];
    list.push(model);
    byProvider.set(provider, list);
  }

  if (modelsReq.loading && models.length === 0) {
    return <div className="text-[var(--color-text-3)]">Loading models…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Models</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          {models.length} models across {byProvider.size} providers
        </p>
      </div>

      {modelsReq.error && (
        <p className="text-sm text-red-400">{modelsReq.error}</p>
      )}

      {[...byProvider.entries()].map(([provider, providerModels]) => (
        <div key={provider}>
          <h2 className="mb-3 text-lg font-semibold capitalize text-[var(--color-text-1)]">
            {provider}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {providerModels.map((model) => (
              <ModelCard key={`${model.provider}/${model.id}`} model={model} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
