import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent?: string;
  onClick?: () => void;
}

export default function MetricCard({ icon, label, value, hint, accent = 'var(--clr-violet-dim)', onClick }: MetricCardProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      className={`stat-card ${interactive ? 'clickable' : ''}`.trim()}
      style={{ ['--card-accent' as string]: accent }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <div
        className="stat-card-icon"
        style={{ background: accent, color: 'var(--txt-primary)' }}
      >
        {icon}
      </div>
      <div className="stat-card-value">{value.toLocaleString('en-US')}</div>
      <div className="stat-card-label">{label}</div>
      {hint ? <div className="stat-card-delta">{hint}</div> : null}
    </div>
  );
}
