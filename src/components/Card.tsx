import type { ReactNode } from "react";
import { classNames } from "../utils/format";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-2)]">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--color-text-3)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
