export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
  good: { fg: 'var(--status-good-fg)', bg: 'var(--status-good-bg)' },
  warn: { fg: 'var(--status-warn-fg)', bg: 'var(--status-warn-bg)' },
  bad: { fg: 'var(--status-bad-fg)', bg: 'var(--status-bad-bg)' },
  info: { fg: 'var(--status-info-fg)', bg: 'var(--status-info-bg)' },
  neutral: { fg: 'var(--text-tertiary)', bg: 'var(--border)' },
};

// Best-effort status -> tone mapping so callers can pass raw backend status
// strings (e.g. "Passed", "Review", "Unsupported") without a lookup table.
export function toneForStatus(status: string | null | undefined): Tone {
  const s = (status || '').toLowerCase();
  if (['passed', 'pass', 'ok', 'connected', 'active', 'approved', 'done', 'auto', 'clean'].some((k) => s.includes(k)))
    return 'good';
  if (['warn', 'review', 'pending', 'partial'].some((k) => s.includes(k))) return 'warn';
  if (['fail', 'error', 'unsupported', 'blocked', 'conflict', 'rejected'].some((k) => s.includes(k))) return 'bad';
  if (['progress', 'info', 'scanning', 'discover'].some((k) => s.includes(k))) return 'info';
  return 'neutral';
}

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  /** Exact [bg, fg] pair — pass this (e.g. from theme/legacyMaps.ts) to match
   * one of the original's five exact status-color lookup tables instead of
   * falling back to the generic 5-tone system below. */
  colors?: [bg: string, fg: string];
}

export function StatusBadge({ label, tone, colors }: StatusBadgeProps) {
  const [bg, fg] = colors ?? (() => {
    const resolved = tone ?? toneForStatus(label);
    const c = TONE_MAP[resolved];
    return [c.bg, c.fg];
  })();
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
