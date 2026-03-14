import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent?: string;
}

export default function MetricCard({ icon, label, value, hint, accent = 'var(--clr-violet-dim)' }: MetricCardProps) {
  return (
    <div className="stat-card" style={{ ['--card-accent' as string]: accent }}>
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

