import type { ScenarioSummary } from '../types/scenario';
import { StatusBadge } from './StatusBadge';

interface ProjectCardProps {
  summary: ScenarioSummary;
  onClick: () => void;
}

export function ProjectCard({ summary, onClick }: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: 'var(--shadow-card)',
        animation: 'fadeInUp 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{summary.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{summary.client}</div>
        </div>
        {summary.stage && <StatusBadge label={summary.stage} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>{summary.source}</span>
        <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)' }}>
          arrow_forward
        </span>
        <span>{summary.target}</span>
      </div>
      <div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${summary.progress ?? 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--brand), var(--brand-gradient-end))',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{summary.progress ?? 0}% complete</div>
      </div>
    </div>
  );
}
