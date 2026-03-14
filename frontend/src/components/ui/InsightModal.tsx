import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

export type InsightTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface InsightMetric {
  label: string;
  value: string;
  tone?: InsightTone;
}

export interface InsightListItem {
  title: string;
  meta?: string;
  value?: string;
  auxiliary?: string;
  tone?: InsightTone;
}

export interface InsightSection {
  title: string;
  caption?: string;
  items: InsightListItem[];
}

interface InsightModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  loading?: boolean;
  metrics?: InsightMetric[];
  sections?: InsightSection[];
  onClose: () => void;
}

function toneClassName(tone: InsightTone = 'default'): string {
  if (tone === 'success') return 'insight-tone-success';
  if (tone === 'warning') return 'insight-tone-warning';
  if (tone === 'danger') return 'insight-tone-danger';
  if (tone === 'info') return 'insight-tone-info';
  return '';
}

export default function InsightModal({
  open,
  title,
  subtitle,
  loading = false,
  metrics = [],
  sections = [],
  onClose,
}: InsightModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="insight-modal-overlay" role="presentation" onClick={onClose}>
      <div className="insight-modal" role="dialog" aria-modal="true" aria-labelledby="insight-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="insight-modal-header">
          <div>
            <div className="insight-modal-eyebrow">Operational Insight</div>
            <h3 id="insight-modal-title">{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close insight modal">
            <X size={18} />
          </button>
        </div>

        <div className="insight-modal-body">
          {loading ? (
            <div className="insight-modal-loading">
              <Loader2 size={18} className="spin" />
              <span>Loading insight...</span>
            </div>
          ) : (
            <>
              {metrics.length ? (
                <div className="insight-metric-grid">
                  {metrics.map((metric) => (
                    <div key={`${metric.label}-${metric.value}`} className={`insight-metric-card ${toneClassName(metric.tone)}`.trim()}>
                      <div className="insight-metric-value">{metric.value}</div>
                      <div className="insight-metric-label">{metric.label}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {sections.map((section) => (
                <section key={section.title} className="insight-section">
                  <div className="insight-section-header">
                    <div>
                      <h4>{section.title}</h4>
                      {section.caption ? <p>{section.caption}</p> : null}
                    </div>
                  </div>

                  <div className="insight-list">
                    {section.items.length ? (
                      section.items.map((item, index) => (
                        <div key={`${section.title}-${item.title}-${index}`} className="insight-row">
                          <div className="insight-row-main">
                            <div className="insight-row-title">{item.title}</div>
                            {item.meta ? <div className="insight-row-meta">{item.meta}</div> : null}
                          </div>
                          <div className="insight-row-side">
                            {item.value ? (
                              <div className={`insight-row-value ${toneClassName(item.tone)}`.trim()}>
                                {item.value}
                              </div>
                            ) : null}
                            {item.auxiliary ? <div className="insight-row-aux">{item.auxiliary}</div> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="insight-empty">No data available for this action.</div>
                    )}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
