import type { DeployLog } from '../types/scenario';

interface LiveLogConsoleProps {
  lines: DeployLog[];
}

export function LiveLogConsole({ lines }: LiveLogConsoleProps) {
  return (
    <div
      style={{
        background: 'var(--navy)',
        color: '#d1fae5',
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: 12,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        maxHeight: 320,
        overflowY: 'auto',
      }}
    >
      {lines.length === 0 && <div style={{ color: '#9CA3AF' }}>No log output yet.</div>}
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
          <span style={{ color: '#6B7280' }}>{line.t}</span>
          <span style={{ color: line.ok ? '#34D399' : '#F87171' }}>{line.ok ? '✓' : '▶'}</span>
          <span>{line.msg}</span>
        </div>
      ))}
    </div>
  );
}
