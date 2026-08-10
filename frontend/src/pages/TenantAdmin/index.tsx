import { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { Button } from '../../components/Button';
import { useToast } from '../../components/ToastContext';

type TabId = 'users' | 'vault' | 'envs' | 'audit';

const TABS: { id: TabId; label: string }[] = [
  { id: 'users', label: 'Users & Roles' },
  { id: 'vault', label: 'Credentials Vault' },
  { id: 'envs', label: 'Environments' },
  { id: 'audit', label: 'Audit Log' },
];

interface TaUser {
  init: string;
  avBg: string;
  name: string;
  email: string;
  role: string;
  roleBg: string;
  roleColor: string;
  access: string;
  status: string;
  stBg: string;
  stColor: string;
}

// Verbatim from the original .dc.html Tenant Admin "Users & Roles" table.
const TA_USERS: TaUser[] = [
  { init: 'RK', avBg: '#E8612D', name: 'Rahul Kumar', email: 'rahul.k@exlservice.com', role: 'Migration Engineer', roleBg: '#FFF7ED', roleColor: '#C2410C', access: 'All projects', status: 'Active', stBg: '#D1FAE5', stColor: '#065F46' },
  { init: 'SP', avBg: '#3B82F6', name: 'Sarah Park', email: 'sarah.p@exlservice.com', role: 'QA Analyst', roleBg: '#EFF6FF', roleColor: '#1D4ED8', access: 'Testing, Reports', status: 'Active', stBg: '#D1FAE5', stColor: '#065F46' },
  { init: 'JM', avBg: '#8B5CF6', name: 'James Miller', email: 'j.miller@acmecorp.com', role: 'Tenant Admin', roleBg: '#F5F3FF', roleColor: '#6D28D9', access: 'Tenant settings', status: 'Active', stBg: '#D1FAE5', stColor: '#065F46' },
  { init: 'LW', avBg: '#10B981', name: 'Lisa Wang', email: 'l.wang@acmecorp.com', role: 'Viewer', roleBg: '#F3F4F6', roleColor: '#6B7280', access: 'Read-only dashboards', status: 'Active', stBg: '#D1FAE5', stColor: '#065F46' },
  { init: 'DK', avBg: '#F59E0B', name: 'David Kim', email: 'd.kim@acmecorp.com', role: 'Viewer', roleBg: '#F3F4F6', roleColor: '#6B7280', access: 'Read-only dashboards', status: 'Invited', stBg: '#FEF3C7', stColor: '#92400E' },
];

interface TaCred {
  abbr: string;
  logoBg: string;
  name: string;
  type: string;
  rotated: string;
  status: string;
  stBg: string;
  stColor: string;
}

const TA_CREDS: TaCred[] = [
  { abbr: 'AVY', logoBg: '#DC2626', name: 'Avaya Aura — ASA/OSSI', type: 'SSH credentials', rotated: '12 days ago', status: 'Healthy', stBg: '#D1FAE5', stColor: '#065F46' },
  { abbr: 'GC', logoBg: '#E8612D', name: 'Genesys Cloud — OAuth client', type: 'Client Credentials grant', rotated: '5 days ago', status: 'Healthy', stBg: '#D1FAE5', stColor: '#065F46' },
  { abbr: 'AWS', logoBg: '#F59E0B', name: 'AWS — Connect deploy role', type: 'IAM Role (STS)', rotated: '30 days ago', status: 'Rotate Soon', stBg: '#FEF3C7', stColor: '#92400E' },
  { abbr: 'JIR', logoBg: '#3B82F6', name: 'Jira — defect export', type: 'API Token', rotated: '2 days ago', status: 'Healthy', stBg: '#D1FAE5', stColor: '#065F46' },
];

interface TaEnv {
  badge: string;
  badgeBg: string;
  badgeColor: string;
  name: string;
  url: string;
  lastDeploy: string;
  status: string;
  stBg: string;
  stColor: string;
}

const TA_ENVS: TaEnv[] = [
  { badge: 'DEV', badgeBg: '#DBEAFE', badgeColor: '#1D4ED8', name: 'Development', url: 'genesys-dev.acme.com', lastDeploy: 'v3.4 — 2h ago', status: 'Healthy', stBg: '#D1FAE5', stColor: '#065F46' },
  { badge: 'UAT', badgeBg: '#FEF3C7', badgeColor: '#92400E', name: 'User Acceptance', url: 'genesys-uat.acme.com', lastDeploy: 'v3.2 — 1d ago', status: 'Deploying', stBg: '#DBEAFE', stColor: '#1D4ED8' },
  { badge: 'PROD', badgeBg: '#D1FAE5', badgeColor: '#065F46', name: 'Production', url: 'genesys.acme.com', lastDeploy: 'v2.9 — 6d ago', status: 'Healthy', stBg: '#D1FAE5', stColor: '#065F46' },
];

interface TaAuditEvent {
  icon: string;
  bg: string;
  color: string;
  user: string;
  action: string;
  time: string;
  ip: string;
}

const TA_AUDIT: TaAuditEvent[] = [
  { icon: 'rocket_launch', bg: '#FFF7ED', color: '#E8612D', user: 'Rahul Kumar', action: 'deployed v3.4 to DEV environment', time: 'Today 14:23', ip: '10.4.22.18' },
  { icon: 'check_circle', bg: '#D1FAE5', color: '#10B981', user: 'Sarah Park', action: 'approved queue & skill mapping review', time: 'Today 11:02', ip: '10.4.22.31' },
  { icon: 'key', bg: '#EFF6FF', color: '#3B82F6', user: 'James Miller', action: 'rotated Genesys Cloud OAuth secret', time: 'Yesterday 16:44', ip: '82.14.9.101' },
  { icon: 'person_add', bg: '#F5F3FF', color: '#8B5CF6', user: 'James Miller', action: 'invited David Kim as Viewer', time: 'Yesterday 09:15', ip: '82.14.9.101' },
  { icon: 'edit', bg: '#FEF3C7', color: '#F59E0B', user: 'Rahul Kumar', action: 'overrode mapping for VIP_EAS_Skill (72% → manual)', time: '2 days ago', ip: '10.4.22.18' },
  { icon: 'upload_file', bg: '#F3F4F6', color: '#6B7280', user: 'Rahul Kumar', action: 'uploaded prompts_bundle.zip (128 MB, virus scan clean)', time: '3 days ago', ip: '10.4.22.18' },
];

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
};

export default function TenantAdmin() {
  const [tab, setTab] = useState<TabId>('users');
  const { showToast } = useToast();

  const userColumns: DataTableColumn<TaUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: r.avBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {r.init}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => <StatusBadge label={r.role} colors={[r.roleBg, r.roleColor]} /> },
    { key: 'access', header: 'Access', render: (r) => <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.access}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge label={r.status} colors={[r.stBg, r.stColor]} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Tenant Admin — Acme Financial</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
          Users & roles, credentials vault, environments, and audit log
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 1,
          background: '#F3F4F6',
          borderRadius: 'var(--radius-md)',
          padding: 3,
          width: 'fit-content',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 16px',
                background: active ? '#fff' : 'transparent',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                boxShadow: active ? 'var(--shadow-tab-active)' : 'none',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'users' && (
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Users & Roles</h3>
            <Button variant="primary" onClick={() => showToast('User invitations are not available in this demo.')}>
              + Invite User
            </Button>
          </div>
          <DataTable columns={userColumns} rows={TA_USERS} rowKey={(r) => r.email} emptyMessage="No users found." />
        </div>
      )}

      {tab === 'vault' && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="material-icons-outlined" style={{ fontSize: 20, color: '#10B981' }}>
              verified_user
            </span>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Credentials Vault</h3>
            <StatusBadge label="AES-256 · HSM-backed" colors={['#F0FDF4', '#065F46']} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {TA_CREDS.map((c, idx) => (
              <div
                key={c.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: idx === TA_CREDS.length - 1 ? 'none' : '1px solid var(--divider)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    background: c.logoBg,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{c.abbr}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {c.type} · Last rotated {c.rotated}
                  </div>
                </div>
                <StatusBadge label={c.status} colors={[c.stBg, c.stColor]} />
                <Button onClick={() => showToast(`Rotation initiated for "${c.name}".`)}>Rotate</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'envs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {TA_ENVS.map((env) => (
            <div key={env.badge} style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span
                  style={{
                    padding: '2px 10px',
                    background: env.badgeBg,
                    color: env.badgeColor,
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {env.badge}
                </span>
                <StatusBadge label={env.status} colors={[env.stBg, env.stColor]} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{env.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>{env.url}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last deploy: {env.lastDeploy}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div style={CARD}>
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>Audit Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {TA_AUDIT.map((e, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: idx === TA_AUDIT.length - 1 ? 'none' : '1px solid var(--divider)',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: e.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: 13, color: e.color }}>
                    {e.icon}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <strong>{e.user}</strong> {e.action}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    {e.time} · IP {e.ip}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
