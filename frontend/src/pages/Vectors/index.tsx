import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';

interface ChainRow {
  dnis: string;
  vdn: string;
  vector: string;
  intent: string;
  status: string;
}

const CHAIN_STATUS_COLORS: Record<string, [string, string]> = {
  Verified: ['#D1FAE5', '#065F46'],
  'Needs SME': ['#FEF3C7', '#92400E'],
  Retire: ['#F3F4F6', '#6B7280'],
};

// Verbatim `vectorChains` from the original .dc.html.
const VECTOR_CHAINS: ChainRow[] = [
  { dnis: '8005551234', vdn: 'VDN 44801', vector: 'Vector 12', intent: 'Main customer service menu → 3 queues', status: 'Verified' },
  { dnis: '8005551235', vdn: 'VDN 44802', vector: 'Vector 14', intent: 'Sales inquiry with VIP ANI check', status: 'Verified' },
  { dnis: '8005559800', vdn: 'VDN 44810', vector: 'Vector 22', intent: 'Payment IVR — converse-on to IR, ASAI data dip', status: 'Needs SME' },
  { dnis: '8005559811', vdn: 'VDN 44811', vector: 'Vector 23', intent: 'After-hours + holiday check (hardcoded TOD in steps)', status: 'Needs SME' },
  { dnis: '8005550909', vdn: 'VDN 44890', vector: 'Vector 31', intent: 'No traffic 12 months (CMS) — retire candidate', status: 'Retire' },
];

interface DupCluster {
  name: string;
  count: number;
  detail: string;
  sim: number;
}

// Verbatim `dupClusters` from the original .dc.html.
const DUP_CLUSTERS: DupCluster[] = [
  {
    name: 'Regional main menus',
    count: 14,
    detail: 'Identical menu logic, only announcement + skill differ → parameterize by DNIS via Data Table',
    sim: 94,
  },
  {
    name: 'Language variants (EN/ES/FR)',
    count: 6,
    detail: 'Same flow, language-specific prompts → single flow with language variable',
    sim: 89,
  },
  {
    name: 'Holiday overflow vectors',
    count: 9,
    detail: 'Copy-pasted per department → one flow + Schedule Group lookup',
    sim: 82,
  },
];

interface SkillBand {
  avaya: string;
  gc: string;
  agents: number;
}

// Verbatim `skillBands` from the original .dc.html.
const SKILL_BANDS: SkillBand[] = [
  { avaya: '1 – 2', gc: '5 (Expert)', agents: 12 },
  { avaya: '3 – 5', gc: '4', agents: 38 },
  { avaya: '6 – 8', gc: '3', agents: 61 },
  { avaya: '9 – 11', gc: '2', agents: 44 },
  { avaya: '12 – 14', gc: '1', agents: 19 },
  { avaya: '15 – 16', gc: '0 (Backup)', agents: 8 },
];

const SKILL_COLUMNS: DataTableColumn<SkillBand>[] = [
  { key: 'avaya', header: 'Avaya Level', render: (r) => r.avaya },
  { key: 'arrow', header: '→', render: () => '→' },
  { key: 'gc', header: 'GC Proficiency', render: (r) => r.gc },
  { key: 'agents', header: 'Agents', render: (r) => r.agents },
];

export default function Vectors() {
  const { scenario } = useData();

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Vector Analysis — Avaya</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
          Chain reconstruction, duplicate detection, and skill level compression
        </p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>DNIS → VDN → Vector Chain Reconstruction</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          Raw vector text steps reassembled into call-flow intent — verify each chain before mapping
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {VECTOR_CHAINS.map((row) => (
            <div
              key={row.dnis}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                flexWrap: 'wrap',
              }}
            >
              <ChainBox label="DNIS" value={row.dnis} />
              <Arrow />
              <ChainBox label="VDN" value={row.vdn} />
              <Arrow />
              <ChainBox label="Vector" value={row.vector} />
              <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: 'var(--text-secondary)', padding: '0 8px' }}>{row.intent}</div>
              <StatusBadge label={row.status} colors={CHAIN_STATUS_COLORS[row.status]} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Duplicate Vector Clusters</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          Near-duplicates → consolidation candidates (parameterized flow + Data Table)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
          {DUP_CLUSTERS.map((cluster) => (
            <div
              key={cluster.name}
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, background: 'var(--bg)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cluster.name}</div>
                <StatusBadge label={`${cluster.count} vectors → 1 flow`} colors={['#DBEAFE', '#1D4ED8']} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 10 }}>{cluster.detail}</p>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${cluster.sim}%`, height: '100%', background: '#3B82F6' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{cluster.sim}% similar</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Skill Level Compression (1–16 → 0–5)</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          Avaya EAS skill levels compressed to Genesys Cloud proficiency — review suggested bands
        </p>
        <DataTable columns={SKILL_COLUMNS} rows={SKILL_BANDS} rowKey={(r) => r.avaya} />
      </div>
    </div>
  );
}

function ChainBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        background: 'var(--surface)',
        minWidth: 110,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function Arrow() {
  return (
    <span className="material-icons-outlined" style={{ color: 'var(--text-muted)', fontSize: 18 }}>
      arrow_forward
    </span>
  );
}
