import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { Button } from '../../components/Button';
import { useToast } from '../../components/ToastContext';
import { api, ApiError } from '../../api/client';
import { statusColor, typeIcon } from '../../theme/legacyMaps';
import type { ConvertRequest, ConvertResponse, MappingItem } from '../../types/scenario';

// Verbatim score-badge color pairs (matches theme/legacyMaps STATUS_COLORS values).
function scoreColors(score: number | null): [string, string] {
  if (score == null) return ['#F3F4F6', '#6B7280'];
  if (score >= 80) return ['#D1FAE5', '#065F46'];
  if (score >= 50) return ['#FEF3C7', '#92400E'];
  return ['#FEE2E2', '#DC2626'];
}

// Static filter-pill counts, verbatim from the original — decorative, not
// derived from the live mapping rows.
const FILTER_PILLS = [
  { label: 'All (214)', active: true },
  { label: 'Review (23)', active: false },
  { label: 'Conflicts (7)', active: false },
];

export default function Mapping() {
  const { scenario, scenarioId } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);

  const mappings = scenario?.mappings ?? [];

  async function convertAndDeploy() {
    if (!scenarioId) return;
    setConverting(true);
    try {
      const req: ConvertRequest = { scenario_id: scenarioId };
      const res = await api.post<ConvertResponse>('/api/convert', req);
      navigate('/deploy', { state: { files: res.files } });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  }

  const columns: DataTableColumn<MappingItem>[] = [
    {
      key: 'source',
      header: 'Source Object',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="material-icons-outlined" style={{ fontSize: 15, color: 'var(--text-tertiary)' }}>
            {typeIcon(row.sType)}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{row.sName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.sType ?? '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (row) => <StatusBadge label={row.score != null ? `${row.score}%` : '—'} colors={scoreColors(row.score)} />,
    },
    {
      key: 'target',
      header: 'Target Object',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="material-icons-outlined" style={{ fontSize: 15, color: 'var(--brand)' }}>
            {typeIcon(row.tType)}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{row.tName ?? '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.tType ?? '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (row.status ? <StatusBadge label={row.status} colors={statusColor(row.status)} /> : '—'),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: () => (
        <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
          <button
            aria-label="Edit mapping"
            onClick={(e) => {
              e.stopPropagation();
              showToast('Row detail view is not available in this demo.');
            }}
            style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', display: 'flex' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>edit</span>
          </button>
          <button
            aria-label="View mapping"
            onClick={(e) => {
              e.stopPropagation();
              showToast('Row detail view is not available in this demo.');
            }}
            style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', display: 'flex' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>visibility</span>
          </button>
        </div>
      ),
    },
  ];

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Mapping Workspace</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Review and finalize source → target object mappings
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => showToast('Auto-mapping complete')}>
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>auto_fix_high</span>
            Auto-Map All
          </Button>
          <Button variant="primary" onClick={convertAndDeploy} disabled={converting}>
            {converting ? 'Converting…' : 'Convert & Deploy'}
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>east</span>
          </Button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Mapping Progress</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand)' }}>87%</span>
        </div>
        <div style={{ height: 6, background: 'var(--divider)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: '62%', background: '#10B981', borderRadius: '3px 0 0 3px' }} />
          <div style={{ width: '25%', background: '#F59E0B' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: 2, display: 'inline-block' }} />
            Auto (132)
          </span>
          <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#F59E0B', borderRadius: 2, display: 'inline-block' }} />
            Review (52)
          </span>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#9CA3AF', borderRadius: 2, display: 'inline-block' }} />
            Unmapped (30)
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {FILTER_PILLS.map((p) => (
              <button
                key={p.label}
                onClick={() => showToast("Filtering isn't available in this demo view.")}
                style={{
                  padding: '5px 12px',
                  background: p.active ? 'var(--brand-tint-bg)' : 'var(--surface)',
                  border: `1px solid ${p.active ? 'var(--brand-tint-border)' : 'var(--border)'}`,
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: p.active ? 700 : 600,
                  color: p.active ? 'var(--brand)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => showToast('Export started')} style={{ padding: '5px 10px', fontSize: 11 }}>
            <span className="material-icons-outlined" style={{ fontSize: 13 }}>download</span>
            Export
          </Button>
        </div>
        <DataTable columns={columns} rows={mappings} rowKey={(row) => `${row.sName}-${row.tName ?? ''}`} emptyMessage="No mappings for this scenario." />
      </div>
    </div>
  );
}
