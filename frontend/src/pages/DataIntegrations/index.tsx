import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { Button } from '../../components/Button';

interface DipRow {
  name: string;
  legacySource: string;
  dataSource: string;
  targetIcon: string;
  targetName: string;
  targetDetail: string;
  status: 'Designed' | 'In Design' | 'Pending';
}

const DIP_STATUS_COLORS: Record<DipRow['status'], [string, string]> = {
  Designed: ['#D1FAE5', '#065F46'],
  'In Design': ['#DBEAFE', '#1D4ED8'],
  Pending: ['#FEF3C7', '#92400E'],
};

// Verbatim `dataDips` (Genesys Cloud variant) from the original .dc.html.
const GC_DIPS: DipRow[] = [
  {
    name: 'CRM Customer Lookup',
    legacySource: 'ASAI Adjunct Route (CTI)',
    dataSource: 'Siebel CRM API',
    targetIcon: 'bolt',
    targetName: 'Data Action (web services)',
    targetDetail: 'Custom action, JSON contract, OAuth',
    status: 'Designed',
  },
  {
    name: 'Holiday/Emergency Flags',
    legacySource: 'Vector variables + holiday table',
    dataSource: 'Static config',
    targetIcon: 'table_chart',
    targetName: 'Data Table + Lookup action',
    targetDetail: 'CSV import, Reference Key: date',
    status: 'Designed',
  },
  {
    name: 'Account Balance IVR',
    legacySource: 'Converse-on step to IR',
    dataSource: 'Host DB (DB2)',
    targetIcon: 'bolt',
    targetName: 'Data Action → AWS Lambda',
    targetDetail: 'Lambda integration, secure flow',
    status: 'In Design',
  },
  {
    name: 'Language Preference',
    legacySource: 'Call Prompting digits',
    dataSource: 'Caller input',
    targetIcon: 'table_chart',
    targetName: 'Data Table lookup by ANI',
    targetDetail: 'Excel upload → data table',
    status: 'Pending',
  },
];

// Verbatim `dataDips` (non-Genesys-Cloud variant) from the original .dc.html.
const NON_GC_DIPS: DipRow[] = [
  {
    name: 'Policy Lookup',
    legacySource: 'CVP DB dip (custom Java)',
    dataSource: 'Claims DB (Oracle)',
    targetIcon: 'bolt',
    targetName: 'Invoke AWS Lambda block',
    targetDetail: '$.External.policyStatus → Set attributes',
    status: 'Designed',
  },
  {
    name: 'Business Hours Check',
    legacySource: 'ICM script time-of-day node',
    dataSource: 'Static config',
    targetIcon: 'schedule',
    targetName: 'Hours of Operation + Check hours block',
    targetDetail: 'Native Connect config',
    status: 'Designed',
  },
  {
    name: 'Priority Customer Flag',
    legacySource: 'ICM DB Lookup node',
    dataSource: 'CRM (Salesforce)',
    targetIcon: 'bolt',
    targetName: 'Lambda + sfInvokeAPI (CTI adapter)',
    targetDetail: 'Salesforce Lambda, contact attributes',
    status: 'In Design',
  },
  {
    name: 'Claim Status Speech Bot',
    legacySource: 'CVP VXML + ASR grammar',
    dataSource: 'Claims API',
    targetIcon: 'smart_toy',
    targetName: 'Amazon Lex bot + Lambda fulfillment',
    targetDetail: 'NLU rebuild, Lex V2',
    status: 'Pending',
  },
];

interface MechCard {
  name: string;
  platform: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  description: string;
  tags: string[];
}

// Verbatim `dataMechs` from the original .dc.html.
const DATA_MECHS: MechCard[] = [
  {
    name: 'Data Actions',
    platform: 'Genesys Cloud',
    icon: 'bolt',
    iconBg: '#FFF7ED',
    iconColor: '#E8612D',
    description: 'Invoke web services, AWS Lambda, or the GC Platform API from Architect flows. Static + custom actions with JSON contracts.',
    tags: ['OAuth 2.0', 'JSON contract', '~300 req/min'],
  },
  {
    name: 'Data Tables',
    platform: 'Genesys Cloud',
    icon: 'table_chart',
    iconBg: '#FFF7ED',
    iconColor: '#E8612D',
    description: 'Key-value config lookup in flows via Data Table Lookup action. Import from CSV/Excel; config data only, no PII.',
    tags: ['CSV import', 'Reference Key', 'Config only'],
  },
  {
    name: 'Lambda Data Dips',
    platform: 'Amazon Connect',
    icon: 'functions',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
    description: 'Invoke AWS Lambda block returns $.External.* attributes. Persist via Set contact attributes; branch with Check attributes.',
    tags: ['Sync/Async', 'STRING_MAP/JSON', '8 flow types'],
  },
  {
    name: 'Custom Webhook',
    platform: 'Any target',
    icon: 'webhook',
    iconBg: '#EFF6FF',
    iconColor: '#3B82F6',
    description: 'Generic REST/webhook integration with auth config, request template, and response-to-variable mapping.',
    tags: ['REST', 'Any auth', 'Reusable'],
  },
  {
    name: 'Static Config Ingestion',
    platform: 'Any target',
    icon: 'upload_file',
    iconBg: '#F0FDF4',
    iconColor: '#10B981',
    description: 'Upload CSV / Excel / JSON lookup data. Provisions as GC Data Table, DynamoDB table, or S3 object per target.',
    tags: ['CSV/Excel/JSON', 'Auto-provision'],
  },
  {
    name: 'Dynamic API Wizard',
    platform: 'Any target',
    icon: 'api',
    iconBg: '#F5F3FF',
    iconColor: '#8B5CF6',
    description: 'Guided setup: endpoint + auth + request/response schema mapping, then generates the target-native artifact.',
    tags: ['Guided', 'Schema mapping'],
  },
];

export default function DataIntegrations() {
  const { scenario } = useData();
  const { showToast } = useToast();

  const rows = useMemo(() => {
    if (!scenario) return [];
    return scenario.target === 'Genesys Cloud' ? GC_DIPS : NON_GC_DIPS;
  }, [scenario]);

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  const columns: DataTableColumn<DipRow>[] = [
    {
      key: 'source',
      header: 'Source Data Dip',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{row.legacySource}</div>
        </div>
      ),
    },
    { key: 'dataSource', header: 'Data Source', render: (row) => row.dataSource },
    {
      key: 'target',
      header: 'Recommended Target',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)', marginTop: 1 }}>
            {row.targetIcon}
          </span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.targetName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{row.targetDetail}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge label={row.status} colors={DIP_STATUS_COLORS[row.status]} />,
    },
    {
      key: 'action',
      header: '',
      width: '110px',
      render: (row) => <Button onClick={() => showToast(`Opening design canvas for ${row.name}…`)}>Design</Button>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Data Integrations</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Map legacy data dips to target-native mechanisms — data actions, Lambda, webhooks, lookup tables
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Data integration builder is not available in this demo.')}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          New Data Integration
        </Button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Source Data Dips → Target Mechanism</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          Discovered data-driven logic in {scenario.source} with recommended {scenario.target} implementation
        </p>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.name} emptyMessage="No source data dips available." />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Provisioning Mechanisms</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
          {DATA_MECHS.map((card) => (
            <div
              key={card.name}
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--bg)' }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: card.iconBg,
                  color: card.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 18 }}>
                  {card.icon}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{card.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{card.platform}</div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 10 }}>{card.description}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '2px 8px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
