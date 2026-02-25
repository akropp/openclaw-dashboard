export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-bright)] border-t-[var(--color-primary)]" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <LoadingSpinner className="mb-3" />
        <p className="text-sm text-[var(--color-text-3)]">Loading...</p>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <p className="text-sm text-[var(--color-text-3)]">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          Retry
        </button>
      )}
    </div>
  );
}
