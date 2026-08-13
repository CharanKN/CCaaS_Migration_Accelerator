import { useData } from '../../context/DataContext';

interface ArtifactDef {
  name: string;
  screen: string;
  icon: string;
  color: string;
}

const ARTIFACTS: ArtifactDef[] = [
  { name: 'Source Inventory', screen: 'Discovery', icon: 'inventory_2', color: '#E8612D' },
  { name: 'Gap Analysis Matrix', screen: 'Discovery', icon: 'analytics', color: '#3B82F6' },
  { name: 'Dependency Graph', screen: 'Discovery', icon: 'hub', color: '#8B5CF6' },
  { name: 'Visual Call Flows', screen: 'Call Flow Viewer', icon: 'account_tree', color: '#10B981' },
  { name: 'Source↔Target Diff', screen: 'Call Flow Viewer', icon: 'difference', color: '#F59E0B' },
  { name: 'Mapping Report', screen: 'Mapping', icon: 'swap_horiz', color: '#E8612D' },
  { name: 'Deployment Manifest', screen: 'Deployment', icon: 'receipt_long', color: '#3B82F6' },
  { name: 'Deployment Logs', screen: 'Deployment', icon: 'terminal', color: '#6B7280' },
  { name: 'Test Results', screen: 'Testing', icon: 'science', color: '#10B981' },
  { name: 'Regression Compare', screen: 'Testing', icon: 'compare', color: '#8B5CF6' },
  { name: 'Migration Summary PDF', screen: 'Reports', icon: 'picture_as_pdf', color: '#EF4444' },
  { name: 'Audit Trail', screen: 'Reports', icon: 'history', color: '#6B7280' },
];

function ColumnPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        background: 'var(--divider)',
      }}
    >
      {label}
    </span>
  );
}

function ComponentTile({ label, detail, variant }: { label: string; detail?: string | null; variant: 'source' | 'target' }) {
  const styles =
    variant === 'source'
      ? { background: '#FAFAFA', border: '1px solid #EBEBEF' }
      : { background: '#FFFBF7', border: '1px solid #FDBA74' };
  return (
    <div
      style={{
        ...styles,
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}
    >
      <div>{label}</div>
      {detail && <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>{detail}</div>}
    </div>
  );
}

export default function Architecture() {
  const { dataset, scenario, scenarioId, setScenarioId } = useData();

  const scenarioOptions = Object.entries(dataset?.scenarios ?? {}).map(([id, s]) => ({ id, name: s.name }));
  const architecture = scenario?.architecture ?? null;
  const sourceComponents = architecture?.sourceComponents ?? [];
  const targetComponents = architecture?.targetComponents ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>System Architecture</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            {scenario
              ? `High-level view of discovered source environment and target design — ${scenario.name}`
              : 'High-level view of discovered source environment and target design'}
          </p>
        </div>
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            minWidth: 220,
          }}
        >
          {scenarioOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
          {/* Source column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ColumnPill label="Source" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{scenario?.source ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sourceComponents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>No source components discovered yet.</p>
              ) : (
                sourceComponents.map((c) => (
                  <ComponentTile key={c.name} label={c.name} detail={[c.type, c.objects].filter(Boolean).join(' — ')} variant="source" />
                ))
              )}
            </div>
          </div>

          {/* Hub column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand), var(--brand-gradient-end))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-cta)',
                flexShrink: 0,
              }}
            >
              <span className="material-icons-outlined" style={{ fontSize: 30 }}>
                sync_alt
              </span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              <div>MIGRATION</div>
              <div>SUITE</div>
            </div>
          </div>

          {/* Target column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ColumnPill label="Target" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{scenario?.target ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {targetComponents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>No target components discovered yet.</p>
              ) : (
                targetComponents.map((c) => (
                  <ComponentTile key={c.name} label={c.name} detail={[c.type, c.objects].filter(Boolean).join(' — ')} variant="target" />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>Artifacts Generated by This Migration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {ARTIFACTS.map((a) => (
            <div
              key={a.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-md)',
                  background: `${a.color}1a`,
                  color: a.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 17 }}>
                  {a.icon}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.screen}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
