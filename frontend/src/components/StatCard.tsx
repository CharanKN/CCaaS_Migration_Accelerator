import type { ReactNode } from 'react';
import type { Tone } from './StatusBadge';

const TONE_COLOR: Record<Tone, string> = {
  good: 'var(--status-good)',
  warn: 'var(--status-warn)',
  bad: 'var(--status-bad)',
  info: 'var(--status-info)',
  neutral: 'var(--brand)',
};

interface StatCardProps {
  icon: string;
  label: string;
  value: ReactNode;
  tone?: Tone;
  trend?: string;
}

export function StatCard({ icon, label, value, tone = 'neutral', trend }: StatCardProps) {
  const color = TONE_COLOR[tone];
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        animation: 'fadeInUp 0.25s ease',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: `${color}1a`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="material-icons-outlined">{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</div>
      {trend && <div style={{ fontSize: 12, color: 'var(--status-good-fg)' }}>{trend}</div>}
    </div>
  );
}
