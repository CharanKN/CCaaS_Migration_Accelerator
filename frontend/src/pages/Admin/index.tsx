import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { StatCard } from '../../components/StatCard';
import { Button } from '../../components/Button';

type TabId = 'tenants' | 'flags' | 'connectors' | 'usage';

const TABS: { id: TabId; label: string }[] = [
  { id: 'tenants', label: 'Tenants' },
  { id: 'flags', label: 'Feature Flags' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'usage', label: 'Usage' },
];

interface TenantRow {
  id: string;
  name: string;
  domain: string;
  plan: string;
  users: number;
  projects: number;
  status: 'Active' | 'Suspended';
}

const TENANTS: TenantRow[] = [
  { id: 't1', name: 'Acme Financial Corp', domain: 'acmecorp.com', plan: 'Enterprise', users: 12, projects: 3, status: 'Active' },
  { id: 't2', name: 'TeleCorp Insurance', domain: 'telecorp.io', plan: 'Enterprise', users: 8, projects: 2, status: 'Active' },
  { id: 't3', name: 'GlobalBank Holdings', domain: 'globalbank.com', plan: 'Professional', users: 5, projects: 1, status: 'Active' },
  { id: 't4', name: 'HealthFirst Inc', domain: 'healthfirst.org', plan: 'Enterprise', users: 10, projects: 4, status: 'Active' },
  { id: 't5', name: 'RetailMax Corp', domain: 'retailmax.com', plan: 'Starter', users: 3, projects: 1, status: 'Suspended' },
];

const TENANT_STATUS_COLORS: Record<TenantRow['status'], [string, string]> = {
  Active: ['#D1FAE5', '#065F46'],
  Suspended: ['#FEF3C7', '#92400E'],
};

type FlagScope = 'Global' | 'Per-Tenant';

interface FlagDef {
  key: string;
  name: string;
  description: string;
  scope: FlagScope;
  defaultOn: boolean;
}

const FLAGS: FlagDef[] = [
  { key: 'discovery', name: 'Discovery & Analysis', description: 'Auto-parse and inventory source artifacts', scope: 'Global', defaultOn: true },
  { key: 'callflow', name: 'Visual Call Flow Viewer', description: 'Interactive node graph with minimap and inspector', scope: 'Global', defaultOn: true },
  { key: 'mapping', name: 'Mapping Workspace', description: 'Source-to-target object mapping with confidence scores', scope: 'Global', defaultOn: true },
  { key: 'deploy', name: 'Deployment Engine', description: 'Convert and deploy to target platform environments', scope: 'Global', defaultOn: true },
  { key: 'testing', name: 'Test Suite Builder', description: 'Automated IVR test execution and validation', scope: 'Global', defaultOn: true },
  { key: 'audioMgmt', name: 'Audio Prompt Management', description: 'Re-record, TTS generation, or reuse prompts', scope: 'Global', defaultOn: true },
  { key: 'jiraInt', name: 'Jira Integration', description: 'Export defects and track issues in Jira', scope: 'Per-Tenant', defaultOn: false },
  { key: 'rollback', name: 'Deployment Rollback', description: 'One-click rollback to previous deployment version', scope: 'Global', defaultOn: true },
  { key: 'bulkOps', name: 'Bulk Operations', description: 'Select and map/convert multiple objects at once', scope: 'Global', defaultOn: true },
  { key: 'diffView', name: 'Source/Target Diff View', description: 'Side-by-side visual comparison of flows', scope: 'Per-Tenant', defaultOn: true },
  { key: 'autoMap', name: 'Auto-Mapping Engine', description: 'AI-assisted automatic object mapping suggestions', scope: 'Global', defaultOn: true },
];

interface ConnectorDef {
  abbr: string;
  name: string;
  type: string;
  logoBg: string;
  version: string;
}

const CONNECTORS: ConnectorDef[] = [
  { abbr: 'AVY', name: 'Avaya Aura', type: 'Source Connector', logoBg: '#DC2626', version: 'v2.4.1' },
  { abbr: 'CSC', name: 'Cisco UCCE', type: 'Source Connector', logoBg: '#0891B2', version: 'v1.8.0' },
  { abbr: 'GEN', name: 'Genesys Engage', type: 'Source Connector', logoBg: '#7C3AED', version: 'v2.1.3' },
  { abbr: 'GC', name: 'Genesys Cloud', type: 'Target Connector', logoBg: '#E8612D', version: 'v3.2.0' },
  { abbr: 'AWS', name: 'Amazon Connect', type: 'Target Connector', logoBg: '#F59E0B', version: 'v2.0.1' },
  { abbr: 'TWL', name: 'Twilio Flex', type: 'Target Connector', logoBg: '#EF4444', version: 'v0.9.2' },
  { abbr: 'F9', name: 'Five9', type: 'Target Connector', logoBg: '#10B981', version: 'v1.5.0' },
  { abbr: 'MTL', name: 'Mitel', type: 'Source Connector', logoBg: '#0D9488', version: 'v0.7.1' },
  { abbr: 'ININ', name: 'PureConnect', type: 'Source Connector', logoBg: '#6366F1', version: 'v1.3.0' },
];

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: on ? '#10B981' : '#D1D5DB',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: 'var(--shadow-toggle-knob)',
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
}

export default function Admin() {
  const { capabilities } = useData();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('tenants');
  const [flagState, setFlagState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FLAGS.map((f) => [f.key, f.defaultOn])),
  );
  const [flagScope, setFlagScope] = useState('Global Defaults');

  const tenantColumns: DataTableColumn<TenantRow>[] = [
    {
      key: 'name',
      header: 'Tenant',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.domain}</div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (r) => r.plan },
    { key: 'users', header: 'Users', render: (r) => r.users },
    { key: 'projects', header: 'Projects', render: (r) => r.projects },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} colors={TENANT_STATUS_COLORS[r.status]} /> },
  ];

  const connectorStatus = (c: ConnectorDef): { label: string; colors: [string, string] } => {
    if (c.name === 'Genesys Cloud') {
      return capabilities?.genesysCloud
        ? { label: 'Live', colors: ['#D1FAE5', '#065F46'] }
        : { label: 'Demo Mode', colors: ['#FEF3C7', '#92400E'] };
    }
    if (c.name === 'Amazon Connect') {
      return capabilities?.amazonConnect
        ? { label: 'Live', colors: ['#D1FAE5', '#065F46'] }
        : { label: 'Demo Mode', colors: ['#FEF3C7', '#92400E'] };
    }
    if (c.name === 'Twilio Flex' || c.name === 'Mitel') {
      return { label: 'Beta', colors: ['#DBEAFE', '#1D4ED8'] };
    }
    return { label: 'Active', colors: ['#D1FAE5', '#065F46'] };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Super Admin</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
          Tenant management, connectors, feature flags, and usage
        </p>
      </div>

      <div style={{ background: '#F3F4F6', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content', display: 'flex', gap: 1 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontSize: 13,
                cursor: 'pointer',
                background: active ? '#fff' : 'transparent',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: active ? 'var(--shadow-tab-active)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'tenants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Tenant Management</h3>
            <Button variant="primary" onClick={() => showToast('Add Tenant dialog is not available in this demo.')}>
              + Add Tenant
            </Button>
          </div>
          <DataTable columns={tenantColumns} rows={TENANTS} rowKey={(r) => r.id} />
        </div>
      )}

      {activeTab === 'flags' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Feature Flags</h3>
            <select
              value={flagScope}
              onChange={(e) => setFlagScope(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <option>Global Defaults</option>
              <option>Acme Financial</option>
              <option>TeleCorp Insurance</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FLAGS.map((flag) => (
              <div
                key={flag.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{flag.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{flag.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      background: 'var(--divider)',
                      padding: '3px 9px',
                      borderRadius: 999,
                    }}
                  >
                    {flag.scope === 'Global' ? 'Global' : 'Per-Tenant'}
                  </span>
                  <ToggleSwitch
                    on={flagState[flag.key]}
                    onClick={() => setFlagState((s) => ({ ...s, [flag.key]: !s[flag.key] }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {CONNECTORS.map((c) => {
            const status = connectorStatus(c);
            return (
              <div
                key={c.abbr}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 'var(--radius-md)',
                      background: c.logoBg,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {c.abbr}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.type}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge label={status.label} colors={status.colors} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'usage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <StatCard icon="api" label="API Calls (This Month)" value="124,892" tone="good" trend="↑ 12% vs last month" />
          <StatCard icon="apartment" label="Active Tenants" value={8} tone="neutral" trend="of 15 licensed" />
          <StatCard icon="storage" label="Storage Used" value="42.8 GB" tone="warn" trend="67% of quota" />
        </div>
      )}
    </div>
  );
}
