import type { CronListResult, CronJobEntry } from "../api/types";
import { useRequest } from "../api/hooks";
import { Card } from "../components/Card";

function formatSchedule(job: CronJobEntry): string {
  if (!job.schedule) return "—";
  switch (job.schedule.kind) {
    case "cron":
      return `cron: ${job.schedule.expr ?? "?"}${job.schedule.tz ? ` (${job.schedule.tz})` : ""}`;
    case "every":
      if (job.schedule.everyMs) {
        const mins = Math.round(job.schedule.everyMs / 60_000);
        return mins >= 60 ? `every ${(mins / 60).toFixed(1)}h` : `every ${mins}m`;
      }
      return "every ?";
    case "at":
      return `at: ${job.schedule.at ?? "?"}`;
    default:
      return job.schedule.kind;
  }
}

function formatTime(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString();
}

function JobRow({ job }: { job: CronJobEntry }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-1)]">
            {job.name ?? job.id}
          </p>
          <p className="mt-0.5 font-mono text-xs text-[var(--color-text-3)]">
            {formatSchedule(job)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            job.enabled !== false
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-zinc-500/20 text-zinc-400"
          }`}
        >
          {job.enabled !== false ? "enabled" : "disabled"}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-3)]">
        {job.payload?.kind && (
          <span>Type: {job.payload.kind}</span>
        )}
        {job.sessionTarget && (
          <span>Target: {job.sessionTarget}</span>
        )}
        {job.lastRunStatus && (
          <span>
            Last: {job.lastRunStatus}
            {job.lastRunDurationMs ? ` (${(job.lastRunDurationMs / 1000).toFixed(1)}s)` : ""}
          </span>
        )}
      </div>

      <div className="flex gap-4 text-xs text-[var(--color-text-3)]">
        <span>Last run: {formatTime(job.lastRunAtMs)}</span>
        <span>Next run: {formatTime(job.nextRunAtMs)}</span>
      </div>
    </Card>
  );
}

export default function CronJobs() {
  const cronReq = useRequest<CronListResult>("cron.list", { includeDisabled: true });
  const jobs = cronReq.data?.jobs ?? [];

  if (cronReq.loading && jobs.length === 0) {
    return <div className="text-[var(--color-text-3)]">Loading cron jobs…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">Cron Jobs</h1>
        <p className="mt-1 text-sm text-[var(--color-text-3)]">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} configured
        </p>
      </div>

      {cronReq.error && (
        <p className="text-sm text-red-400">{cronReq.error}</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
