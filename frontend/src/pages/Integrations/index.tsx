import { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastContext';

type Category = 'All' | 'CRM' | 'ITSM' | 'Cloud';

const CATEGORIES: Category[] = ['All', 'CRM', 'ITSM', 'Cloud'];

interface Integration {
  name: string;
  desc: string;
  icon: string;
  logoBg: string;
  logoColor: string;
  status: string;
  stBg: string;
  stColor: string;
  authType: string;
  protocol: string;
  hasMcp: boolean;
  category: string;
}

// Verbatim from the original .dc.html `integrations` array. Note the source
// data includes a "Notifications" category (Slack, MS Teams) that has no
// matching tab — the original never filters the grid by the active tab, so
// this mismatch is intentional and preserved rather than "fixed".
const INTEGRATIONS: Integration[] = [
  { name: 'Salesforce', desc: 'CRM data sync, agent mapping, case management', icon: 'cloud', logoBg: '#EFF6FF', logoColor: '#1D4ED8', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'OAuth 2.0', protocol: 'REST API', hasMcp: false, category: 'CRM' },
  { name: 'Jira', desc: 'Defect tracking, migration task management', icon: 'bug_report', logoBg: '#EFF6FF', logoColor: '#1D4ED8', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'API Token', protocol: 'REST API', hasMcp: true, category: 'ITSM' },
  { name: 'ServiceNow', desc: 'ITSM integration, change management workflows', icon: 'confirmation_number', logoBg: '#F0FDF4', logoColor: '#10B981', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'OAuth 2.0', protocol: 'REST API', hasMcp: true, category: 'ITSM' },
  { name: 'AWS CloudFormation', desc: 'Infrastructure as code for Amazon Connect deploys', icon: 'cloud_queue', logoBg: '#FFFBEB', logoColor: '#F59E0B', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'IAM Keys', protocol: 'AWS SDK', hasMcp: false, category: 'Cloud' },
  { name: 'Terraform / CX as Code', desc: 'Genesys Cloud infrastructure automation', icon: 'terminal', logoBg: '#F5F3FF', logoColor: '#7C3AED', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'OAuth 2.0', protocol: 'CLI/API', hasMcp: false, category: 'Cloud' },
  { name: 'Slack', desc: 'Migration status notifications, team alerts', icon: 'chat', logoBg: '#FFF7ED', logoColor: '#E8612D', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'Bot Token', protocol: 'Webhook', hasMcp: true, category: 'Notifications' },
  { name: 'Microsoft Teams', desc: 'Status updates, approval notifications', icon: 'groups', logoBg: '#EFF6FF', logoColor: '#3B82F6', status: 'Available', stBg: '#D1FAE5', stColor: '#065F46', authType: 'OAuth 2.0', protocol: 'Graph API', hasMcp: true, category: 'Notifications' },
  { name: 'PagerDuty', desc: 'Incident management for failed deployments', icon: 'notification_important', logoBg: '#FEF2F2', logoColor: '#EF4444', status: 'Beta', stBg: '#DBEAFE', stColor: '#1D4ED8', authType: 'API Key', protocol: 'REST API', hasMcp: false, category: 'ITSM' },
  { name: 'Azure DevOps', desc: 'CI/CD pipelines for migration workflows', icon: 'rocket', logoBg: '#EFF6FF', logoColor: '#1D4ED8', status: 'Coming Soon', stBg: '#F3F4F6', stColor: '#6B7280', authType: 'PAT', protocol: 'REST API', hasMcp: false, category: 'Cloud' },
];

export default function Integrations() {
  const [category, setCategory] = useState<Category>('All');
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const { showToast } = useToast();

  // The category tabs are real (they track state and highlight the active
  // pill below), but — just like the original .dc.html — they never
  // actually filter this grid. All 9 cards always render.
  const cards = INTEGRATIONS;

  function closeModal() {
    setActiveIntegration(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Integrations</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Out-of-the-box connectors via SDK, API, and MCP protocols
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => showToast('Custom integration setup is not available in this demo.')}
        >
          <span className="material-icons-outlined" style={{ fontSize: 15 }}>
            add
          </span>
          Add Integration
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 3,
          background: '#F3F4F6',
          borderRadius: 'var(--radius-md)',
          padding: 3,
          width: 'fit-content',
        }}
      >
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
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
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {cards.map((i) => (
          <div
            key={i.name}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  background: i.logoBg,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 20, color: i.logoColor }}>
                  {i.icon}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{i.name}</div>
                  <StatusBadge label={i.status} colors={[i.stBg, i.stColor]} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{i.desc}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', background: '#F3F4F6', borderRadius: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {i.authType}
              </span>
              <span style={{ padding: '2px 8px', background: '#F3F4F6', borderRadius: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {i.protocol}
              </span>
              {i.hasMcp && (
                <span style={{ padding: '2px 8px', background: '#EFF6FF', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#1D4ED8' }}>
                  MCP
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.category}</span>
              <button
                onClick={() => setActiveIntegration(i)}
                style={{
                  padding: '5px 12px',
                  background: 'var(--brand-tint-bg)',
                  border: '1px solid var(--brand-tint-border)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 13 }}>
                  settings
                </span>
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!activeIntegration}
        onClose={closeModal}
        title="Configure Integration"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast(`Test connection to ${activeIntegration?.name} succeeded.`)}
            >
              <span className="material-icons-outlined" style={{ fontSize: 14 }}>
                cable
              </span>
              Test
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                showToast(`${activeIntegration?.name} connected.`);
                closeModal();
              }}
            >
              Save & Connect
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>{activeIntegration?.name}</p>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Authentication Method
            </label>
            <select
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontFamily: 'inherit',
                background: '#F9FAFB',
              }}
            >
              <option>OAuth 2.0 (Client Credentials)</option>
              <option>API Key</option>
              <option>Basic Auth</option>
              <option>Bearer Token</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Client ID / API Key
              </label>
              <input
                type="text"
                placeholder="Enter client ID or API key"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: '#F9FAFB',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Client Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: '#F9FAFB',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Endpoint URL / Base URL
            </label>
            <input
              type="text"
              placeholder="https://api.example.com/v2"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontFamily: 'inherit',
                background: '#F9FAFB',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Required Permissions / Scopes
            </label>
            <textarea
              placeholder="e.g. admin:read, flows:write, users:manage"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontFamily: 'inherit',
                background: '#F9FAFB',
                minHeight: 60,
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--brand-tint-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--brand-tint-border)',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)' }}>
              lock
            </span>
            <span style={{ fontSize: 11, color: '#92400E', fontWeight: 500 }}>
              Credentials encrypted at rest (AES-256) and stored in the secure vault.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
