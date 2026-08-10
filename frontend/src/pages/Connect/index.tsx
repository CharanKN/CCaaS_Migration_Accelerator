import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { api, ApiError } from '../../api/client';
import type { ConnectionResult, DiscoverResult } from '../../types/scenario';

interface Platform {
  id: string;
  abbr: string;
  name: string;
  version: string;
  logoBg: string;
}

// Verbatim `plats` from the original, plus Genesys Cloud / Amazon Connect
// appended (additive) so the two real backend connectors stay reachable.
const PLATFORMS: Platform[] = [
  { id: 'avaya-aura', abbr: 'AVY', name: 'Avaya Aura', version: 'v8.x / Elite', logoBg: '#DC2626' },
  { id: 'cisco-ucce', abbr: 'CSC', name: 'Cisco UCCE', version: 'v12.x / UCCX', logoBg: '#0891B2' },
  { id: 'genesys-engage', abbr: 'GEN', name: 'Genesys Engage', version: 'PureEngage 9.x', logoBg: '#7C3AED' },
  { id: 'avaya-cms', abbr: 'ACM', name: 'Avaya CMS', version: 'CMS R18+', logoBg: '#DC2626' },
  { id: 'mitel', abbr: 'MTL', name: 'Mitel / Unify', version: 'MiContact', logoBg: '#0D9488' },
  { id: 'pureconnect', abbr: 'ININ', name: 'PureConnect', version: 'IC 2018+', logoBg: '#6366F1' },
  { id: 'genesys-cloud', abbr: 'GC', name: 'Genesys Cloud', version: 'Real connector', logoBg: '#E8612D' },
  { id: 'amazon-connect', abbr: 'AWS', name: 'Amazon Connect', version: 'Real connector', logoBg: '#F59E0B' },
];

const LIVE_CAPABLE = new Set(['genesys-cloud', 'amazon-connect']);

interface SmeField {
  label: string;
  placeholder: string;
  hint: string;
  required: boolean;
}

// Verbatim `smeFieldDefs`, keyed by exact source-platform name.
const SME_FIELDS: Record<string, SmeField[]> = {
  'Avaya Aura': [
    { label: 'ASA / OSSI SSH Host', placeholder: 'cm-prod.acme.com:5022', hint: 'For vector & VDN text dumps (list vdn, display vector)', required: true },
    { label: 'CMS ODBC Connection', placeholder: 'cms.acme.com:1433', hint: 'Historical reports for traffic sizing & retire candidates', required: false },
    { label: 'Announcement Board Path', placeholder: '/var/announcements', hint: 'Audio .wav sources for prompt migration', required: true },
    { label: 'AAEP / Orchestration Designer', placeholder: 'Upload OD project ZIP', hint: 'Self-service IVR source + prompt WAVs', required: false },
  ],
  'Cisco UCCE': [
    { label: 'ICM AW/HDS Server', placeholder: 'icm-aw.acme.com', hint: 'Config Manager exports & .ICMS scripts', required: true },
    { label: 'CUCM AXL Endpoint', placeholder: 'https://cucm.acme.com:8443/axl', hint: 'CTI route points, ports, dial plans', required: true },
    { label: 'CVP VXML Studio Projects', placeholder: 'Upload project ZIPs', hint: 'Custom Java classes flagged for rebuild', required: false },
    { label: 'Finesse Admin URL', placeholder: 'https://finesse.acme.com', hint: 'Desktop layouts (XML)', required: false },
  ],
  'Genesys Engage': [
    { label: 'Config Server Host', placeholder: 'gax.acme.com:8080', hint: 'GAX API for DNs, skills, agents', required: true },
    { label: 'IRD Strategy XML Export', placeholder: 'Upload strategy XMLs', hint: 'From IRD Export to File (*.xml)', required: true },
    { label: 'GVP VXML App Directory', placeholder: '/opt/genesys/gvp/apps', hint: 'Self-service applications', required: false },
    { label: 'Stat Server Config', placeholder: 'statserver.acme.com', hint: 'Stat definitions & thresholds', required: false },
  ],
};
const SME_FIELDS_DEFAULT: SmeField[] = [
  { label: 'Admin Console URL', placeholder: 'https://admin.example.com', hint: 'Primary configuration access', required: true },
  { label: 'Export Files', placeholder: 'Upload config exports', hint: 'Platform-native export formats', required: false },
];

// Verbatim `uploadedFiles` fallback.
const UPLOADED_FILES = [
  { name: 'avaya_ivr_export.xml', size: '2.4 MB', type: 'XML Call Flow', icon: 'description', iconColor: '#E8612D', status: 'Parsed', colors: ['#D1FAE5', '#065F46'] as [string, string] },
  { name: 'prompts_bundle.zip', size: '128 MB', type: 'Audio Archive', icon: 'folder_zip', iconColor: '#8B5CF6', status: 'Scanning...', colors: ['#DBEAFE', '#1D4ED8'] as [string, string] },
  { name: 'routing_rules.csv', size: '340 KB', type: 'CSV Export', icon: 'table_chart', iconColor: '#10B981', status: 'Parsed', colors: ['#D1FAE5', '#065F46'] as [string, string] },
  { name: 'legacy_handlers.ihd', size: '4.1 MB', type: 'Unknown format', icon: 'error_outline', iconColor: '#EF4444', status: 'Parse Failed — unsupported format, flag for SME', colors: ['#FEE2E2', '#DC2626'] as [string, string] },
];

export default function Connect() {
  const { scenarioId, capabilities } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'connector' | 'upload'>('connector');
  const [platform, setPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = PLATFORMS.find((p) => p.id === platform) ?? null;
  const isLive =
    platform === 'genesys-cloud' ? capabilities?.genesysCloud : platform === 'amazon-connect' ? capabilities?.amazonConnect : false;
  const smeFields = selected ? SME_FIELDS[selected.name] ?? SME_FIELDS_DEFAULT : SME_FIELDS_DEFAULT;

  function setField(key: string, value: string) {
    setCredentials((c) => ({ ...c, [key]: value }));
  }

  async function testConnection() {
    if (!platform) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await api.post<ConnectionResult>('/api/connect', { platform, credentials });
      setResult(res);
      showToast(res.detail || 'Connection successful.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  }

  async function connectAndDiscover() {
    if (!platform) return;
    setConnecting(true);
    setError(null);
    try {
      const connectRes = await api.post<ConnectionResult>('/api/connect', { platform, credentials });
      setResult(connectRes);
      await api.post<DiscoverResult>('/api/discover', undefined, { platform, scenario_id: scenarioId });
      showToast('Discovery complete.');
      navigate('/discovery');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connect & Discover failed.');
    } finally {
      setConnecting(false);
    }
  }

  const tabButtonStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--brand)' : 'var(--text-tertiary)',
    fontWeight: active ? (700 as const) : (600 as const),
    border: 'none',
    boxShadow: active ? 'var(--shadow-tab-active)' : 'none',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 820 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Source Connection</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
          Connect to your legacy platform or upload exported configuration files
        </p>
      </div>

      <div style={{ display: 'flex', gap: 1, background: '#F3F4F6', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content' }}>
        <button style={tabButtonStyle(tab === 'connector')} onClick={() => setTab('connector')}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>cloud</span>
          Live Connector
        </button>
        <button style={tabButtonStyle(tab === 'upload')} onClick={() => setTab('upload')}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>upload_file</span>
          File Upload
        </button>
      </div>

      {tab === 'connector' ? (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Select Source Platform</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setResult(null); setError(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${platform === p.id ? 'var(--brand)' : 'var(--border)'}`,
                    background: platform === p.id ? 'var(--brand-tint-bg)' : 'var(--surface)',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: p.logoBg,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {p.abbr}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.version}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>Connection Details — {selected.name}</h3>
                {LIVE_CAPABLE.has(selected.id) && (
                  <StatusBadge label={isLive ? 'Live connector configured' : 'Falls back to demo data'} tone={isLive ? 'good' : 'warn'} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  Host / Endpoint
                  <input
                    placeholder="https://aes.acme.com:8443"
                    value={credentials.host ?? ''}
                    onChange={(e) => setField('host', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  Auth Type
                  <select
                    onChange={(e) => setField('auth_type', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                  >
                    <option>OAuth 2.0</option>
                    <option>API Key</option>
                    <option>Basic Auth</option>
                    <option>Certificate</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {selected.id === 'genesys-cloud' ? 'Client ID' : selected.id === 'amazon-connect' ? 'AWS Access Key ID' : 'Client ID'}
                  <input
                    placeholder="Enter client ID"
                    value={credentials[selected.id === 'amazon-connect' ? 'aws_access_key_id' : 'client_id'] ?? ''}
                    onChange={(e) => setField(selected.id === 'amazon-connect' ? 'aws_access_key_id' : 'client_id', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {selected.id === 'amazon-connect' ? 'AWS Secret Access Key' : 'Client Secret'}
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={credentials[selected.id === 'amazon-connect' ? 'aws_secret_access_key' : 'client_secret'] ?? ''}
                    onChange={(e) => setField(selected.id === 'amazon-connect' ? 'aws_secret_access_key' : 'client_secret', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                  />
                </label>
                {LIVE_CAPABLE.has(selected.id) && (
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Region
                    <input
                      placeholder={selected.id === 'genesys-cloud' ? 'mypurecloud.com' : 'us-east-1'}
                      value={credentials.region ?? ''}
                      onChange={(e) => setField('region', e.target.value)}
                      style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                    />
                  </label>
                )}
              </div>

              <div style={{ marginTop: 20 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '0 0 12px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>engineering</span>
                  Platform-Specific Requirements (SME input)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {smeFields.map((f) => (
                    <label key={f.label} style={{ fontSize: 12, fontWeight: 600 }}>
                      {f.label}
                      {f.required && <span style={{ color: 'var(--status-bad)' }}> *</span>}
                      <input
                        placeholder={f.placeholder}
                        style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
                      />
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{f.hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons-outlined" style={{ fontSize: 14 }}>lock</span>
                Credentials encrypted at rest (AES-256) and stored in the secure vault.
              </p>

              {error && <p style={{ color: 'var(--status-bad-fg)', fontSize: 13 }}>{error}</p>}
              {result && !error && <p style={{ color: 'var(--status-good-fg)', fontSize: 13 }}>{result.detail}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button onClick={testConnection} disabled={connecting}>
                  <span className="material-icons-outlined" style={{ fontSize: 16 }}>cable</span>
                  Test Connection
                </Button>
                <Button variant="primary" onClick={connectAndDiscover} disabled={connecting}>
                  {connecting ? 'Working…' : 'Connect & Discover'}
                  <span className="material-icons-outlined" style={{ fontSize: 16 }}>east</span>
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            onClick={() => showToast('File picker is not available in this demo environment — drop-to-upload only.')}
            style={{
              background: 'var(--surface)',
              border: '2px dashed var(--border-input)',
              borderRadius: 'var(--radius-lg)',
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 32, color: 'var(--text-muted)' }}>cloud_upload</span>
            <p style={{ fontWeight: 600, marginTop: 8 }}>Drop files or click to browse</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              XML, VXML, JSON, CSV, WAV, MP3, ZIP • Max 500MB per file
            </p>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Upload Source Files</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {UPLOADED_FILES.map((f) => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                  <span className="material-icons-outlined" style={{ color: f.iconColor }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.size} · {f.type}</div>
                  </div>
                  <StatusBadge label={f.status} colors={f.colors} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              onClick={() => {
                showToast('Files parsed — proceeding to discovery.');
                navigate('/discovery');
              }}
            >
              Parse & Discover
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>east</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
