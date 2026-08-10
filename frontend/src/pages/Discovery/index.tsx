import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { statusColor, typeIcon, complexityColor } from '../../theme/legacyMaps';
import type { InventoryItem } from '../../types/scenario';

interface DepNode {
  level: string;
  name: string;
  detail: string;
  icon: string;
  color: string;
  border: string;
  bg: string;
  arrow: boolean;
}

interface StatDef {
  label: string;
  caption: string;
  color: string;
  value: number | string;
}

function complexityLabel(pct: number | null | undefined): string {
  if (pct == null) return '—';
  if (pct > 75) return 'High';
  if (pct > 40) return 'Med';
  return 'Low';
}

export default function Discovery() {
  const { scenario } = useData();
  const navigate = useNavigate();
  const [inspecting, setInspecting] = useState<InventoryItem | null>(null);

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  const gap = scenario.gap;
  const firstFlow = scenario.inventory[0];

  // Verbatim `depChain` from the original — static except for the first
  // node, which reflects the scenario's first inventory item.
  const depChain: DepNode[] = [
    {
      level: 'Flow',
      name: firstFlow?.name || 'Main IVR — Customer Service',
      detail: firstFlow?.id || 'FLOW-001',
      icon: 'account_tree',
      color: '#E8612D',
      border: '#FDBA74',
      bg: '#FFFBF7',
      arrow: true,
    },
    {
      level: 'Prompts',
      name: '12 audio prompts',
      detail: 'welcome, menu, hold...',
      icon: 'graphic_eq',
      color: '#8B5CF6',
      border: '#DDD6FE',
      bg: '#FDFCFF',
      arrow: true,
    },
    {
      level: 'Queues',
      name: '4 queues',
      detail: 'sales, support, billing, vip',
      icon: 'queue',
      color: '#3B82F6',
      border: '#BFDBFE',
      bg: '#FBFDFF',
      arrow: true,
    },
    {
      level: 'Skills',
      name: '6 skills',
      detail: 'incl. VIP routing',
      icon: 'star',
      color: '#F59E0B',
      border: '#FDE68A',
      bg: '#FFFDF5',
      arrow: true,
    },
    {
      level: 'Numbers',
      name: '3 DNIS',
      detail: '8005551234 +2',
      icon: 'phone',
      color: '#10B981',
      border: '#A7F3D0',
      bg: '#F8FFFB',
      arrow: false,
    },
  ];

  const stats: StatDef[] = [
    { label: 'Auto-Mappable', caption: 'Ready for conversion', color: '#10B981', value: gap?.auto ?? 0 },
    { label: 'Manual Review', caption: 'Needs human decision', color: '#F59E0B', value: gap?.review ?? 0 },
    { label: 'Unsupported', caption: 'No target equivalent', color: '#EF4444', value: gap?.unsupported ?? 0 },
    { label: 'Complexity Score', caption: 'Medium-High', color: '#3B82F6', value: gap?.complexity ?? '—' },
  ];

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Object',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              background: 'var(--divider)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 14, color: 'var(--brand)' }}>
              {typeIcon(row.type)}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.id}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.type ?? '—'}</span> },
    {
      key: 'complexity',
      header: 'Complexity',
      render: (row) => {
        const pct = row.cpct ?? 0;
        const color = complexityColor(pct);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 50, height: 4, background: 'var(--divider)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {complexityLabel(row.cpct)} · {row.cpct != null ? `${row.cpct}%` : '—'}
            </span>
          </div>
        );
      },
    },
    { key: 'deps', header: 'Dependencies', render: (row) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.deps ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (row.status ? <StatusBadge label={row.status} colors={statusColor(row.status)} /> : '—'),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      render: (row) => (
        <div style={{ textAlign: 'right' }}>
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setInspecting(row);
            }}
            style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)' }}
          >
            Inspect
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Discovery &amp; Analysis</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Normalized inventory from {scenario.source} with gap analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => navigate('/callflow')}>
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>account_tree</span>
            View Call Flows
          </Button>
          <Button variant="primary" onClick={() => navigate('/mapping')}>
            Proceed to Mapping
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>east</span>
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${s.color}`,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.caption}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Dependency Map — Main IVR</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>flow → prompts → queues → skills → numbers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
          {depChain.map((dc) => (
            <div key={dc.level} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  border: `1.5px solid ${dc.border}`,
                  background: dc.bg,
                  borderRadius: 10,
                  padding: '12px 16px',
                  minWidth: 130,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="material-icons-outlined" style={{ fontSize: 15, color: dc.color }}>{dc.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: dc.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {dc.level}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{dc.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{dc.detail}</div>
              </div>
              {dc.arrow && (
                <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', margin: '0 6px' }}>
                  east
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Object Inventory</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              defaultValue="All Types"
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, background: 'var(--surface)', cursor: 'pointer', fontWeight: 500 }}
            >
              <option>All Types</option>
              <option>IVR Flows</option>
              <option>Queues</option>
              <option>Skills</option>
            </select>
            <select
              defaultValue="All Statuses"
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, background: 'var(--surface)', cursor: 'pointer', fontWeight: 500 }}
            >
              <option>All Statuses</option>
              <option>Auto-mapped</option>
              <option>Needs Review</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={scenario.inventory}
          rowKey={(row) => row.id}
          emptyMessage="No objects discovered yet."
        />
      </div>

      <Modal open={!!inspecting} onClose={() => setInspecting(null)} title={inspecting?.name ?? 'Item'}>
        <pre
          style={{
            margin: 0,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'var(--bg)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
          }}
        >
          {JSON.stringify(inspecting, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}
