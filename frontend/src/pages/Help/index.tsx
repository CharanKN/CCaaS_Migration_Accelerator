import { useState } from 'react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/ToastContext';

interface HelpCategory {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  articles: string[];
}

// Verbatim from the original .dc.html `helpCategories` array.
const HELP_CATEGORIES: HelpCategory[] = [
  { icon: 'rocket_launch', iconBg: '#FFF7ED', iconColor: '#E8612D', title: 'Getting Started', desc: 'Set up your first project, connect source platforms, and understand the migration pipeline.', articles: ['Quick Start Guide', 'Creating a Project', 'Connecting Sources'] },
  { icon: 'cloud', iconBg: '#EFF6FF', iconColor: '#3B82F6', title: 'Source Connectors', desc: 'Platform-specific guides for Avaya, Cisco, Genesys Engage, Mitel, and PureConnect.', articles: ['Avaya Export Guide', 'Cisco UCCE Setup', 'Genesys IRD Export'] },
  { icon: 'search', iconBg: '#F0FDF4', iconColor: '#10B981', title: 'Discovery & Analysis', desc: 'Understanding parsed inventory, gap analysis reports, complexity scoring, and dependency maps.', articles: ['Reading Gap Analysis', 'Complexity Scores', 'Object Dependencies'] },
  { icon: 'account_tree', iconBg: '#F5F3FF', iconColor: '#8B5CF6', title: 'Call Flow Viewer', desc: 'Navigate the visual graph, use the minimap, inspect nodes, and compare source vs target flows.', articles: ['Graph Navigation', 'Node Inspector', 'Diff View'] },
  { icon: 'swap_horiz', iconBg: '#FFFBEB', iconColor: '#F59E0B', title: 'Mapping & Transformation', desc: 'Auto-mapping engine, manual overrides, confidence scores, and transformation rules.', articles: ['Auto-Map Guide', 'Manual Overrides', 'Rules Engine'] },
  { icon: 'rocket_launch', iconBg: '#FEF2F2', iconColor: '#EF4444', title: 'Deployment', desc: 'Environment setup, dry-run validation, live deployment logs, rollback procedures, and versioning.', articles: ['Deploy Wizard', 'Rollback SOP', 'Version History'] },
  { icon: 'science', iconBg: '#EFF6FF', iconColor: '#3B82F6', title: 'Testing', desc: 'Build IVR test suites, configure DTMF/speech inputs, review results, and export defects.', articles: ['Test Builder', 'Results Analysis', 'Jira Export'] },
  { icon: 'admin_panel_settings', iconBg: '#F5F5F7', iconColor: '#6B7280', title: 'Administration', desc: 'Tenant management, RBAC roles, feature flags, audit logs, and credential vault.', articles: ['RBAC Setup', 'Feature Flags', 'Audit Trail'] },
];

interface Prereq {
  abbr: string;
  logoBg: string;
  platform: string;
  items: string[];
}

// Verbatim from the original .dc.html `prereqs` array — 5 requirement chips
// per platform, all shown (not truncated to 3).
const PREREQS: Prereq[] = [
  { abbr: 'AVY', logoBg: '#DC2626', platform: 'Avaya Aura / Elite', items: ['ASA/GEDI admin access', 'SSH to CM server', 'CMS ODBC credentials', 'Announcement board access', 'VDN/Vector list exports'] },
  { abbr: 'CSC', logoBg: '#0891B2', platform: 'Cisco UCCE / UCCX', items: ['ICM Script Editor access', 'AXL API credentials', 'CVP VXML project files', 'Finesse admin access', 'CUIC report templates'] },
  { abbr: 'GEN', logoBg: '#7C3AED', platform: 'Genesys Engage', items: ['IRD XML strategy exports', 'GAX admin credentials', 'Composer project files', 'GVP VXML apps', 'Config Server access'] },
  { abbr: 'GC', logoBg: '#E8612D', platform: 'Genesys Cloud (Target)', items: ['OAuth client credentials', 'Org admin role', 'Architect permissions', 'Target org region', 'Division structure'] },
  { abbr: 'AWS', logoBg: '#F59E0B', platform: 'Amazon Connect (Target)', items: ['IAM access keys', 'Connect instance ID', 'S3 bucket for prompts', 'Lambda function ARNs', 'Lex bot definitions'] },
  { abbr: 'TWL', logoBg: '#EF4444', platform: 'Twilio Flex (Target)', items: ['Account SID + Auth Token', 'Flex project SID', 'TaskRouter workspace', 'Studio flow access', 'Serverless service'] },
];

export default function Help() {
  const [query, setQuery] = useState('');
  const { showToast } = useToast();

  const filtered = HELP_CATEGORIES.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Help Center</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
          Documentation, SOPs, prerequisites, and step-by-step guides
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <span
          className="material-icons-outlined"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text-muted)' }}
        >
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles, SOPs, prerequisites..."
          style={{
            width: '100%',
            padding: '12px 14px 12px 42px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 14,
            fontFamily: 'inherit',
            background: 'var(--surface)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      <div
        style={{
          background: 'var(--gradient-help-banner)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Getting Started
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Quick Start Guide</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 500 }}>
            Follow our step-by-step walkthrough to set up your first migration project — from connecting your source
            platform to running automated tests.
          </p>
        </div>
        <Button
          onClick={() => showToast('Launching the quick start walkthrough…')}
          style={{ background: 'var(--brand)', color: '#fff', whiteSpace: 'nowrap' }}
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            play_circle
          </span>
          Start Walkthrough
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map((cat) => (
          <div
            key={cat.title}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: cat.iconBg,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 18, color: cat.iconColor }}>
                  {cat.icon}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{cat.title}</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>{cat.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cat.articles.map((a) => (
                <span
                  key={a}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    background: 'var(--divider)',
                    borderRadius: 4,
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    article
                  </span>
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: 13 }}>No categories match your search.</p>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>Prerequisites by Platform</h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PREREQS.map((p, idx) => (
            <div
              key={p.platform}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 0',
                borderBottom: idx === PREREQS.length - 1 ? 'none' : '1px solid var(--divider)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  background: p.logoBg,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{p.abbr}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{p.platform}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.items.map((item) => (
                    <span
                      key={item}
                      style={{
                        padding: '2px 8px',
                        background: 'var(--divider)',
                        borderRadius: 4,
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
