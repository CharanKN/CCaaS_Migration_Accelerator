import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { api, ApiError } from '../../api/client';
import type { ConnectionResult, DiscoverResult, UploadResult } from '../../types/scenario';

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

interface SampleFile {
  url: string;
  filename: string;
}

const DEFAULT_SAMPLE_FILE: SampleFile = { url: '/samples/avaya_ivr_export.json', filename: 'avaya_ivr_export.json' };

// Per-scenario sample exports — each demo project gets a source-platform
// export tailored to its own client/inventory instead of one shared file.
const SCENARIO_SAMPLE_FILES: Record<string, SampleFile> = {
  'avaya-connect': { url: '/samples/avaya_connect_export.json', filename: 'avaya_connect_export.json' },
};

function fileIcon(name: string): { icon: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'json') return { icon: 'data_object', color: '#E8612D' };
  if (ext === 'xml' || ext === 'vxml') return { icon: 'description', color: '#E8612D' };
  if (ext === 'zip') return { icon: 'folder_zip', color: '#8B5CF6' };
  if (ext === 'csv') return { icon: 'table_chart', color: '#10B981' };
  if (ext === 'wav' || ext === 'mp3') return { icon: 'graphic_eq', color: '#3B82F6' };
  return { icon: 'insert_drive_file', color: '#6B7280' };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadStatus = 'ready' | 'parsing' | 'parsed' | 'failed';

interface UploadEntry {
  file: File;
  status: UploadStatus;
  message?: string;
}

function statusBadgeFor(entry: UploadEntry): { label: string; colors: [string, string] } {
  switch (entry.status) {
    case 'parsed':
      return { label: entry.message ?? 'Parsed', colors: ['#D1FAE5', '#065F46'] };
    case 'parsing':
      return { label: 'Parsing…', colors: ['#DBEAFE', '#1D4ED8'] };
    case 'failed':
      return { label: entry.message ?? 'Parse failed', colors: ['#FEE2E2', '#DC2626'] };
    default:
      return { label: 'Ready to parse', colors: ['#F3F4F6', '#374151'] };
  }
}

export default function Connect() {
  const { scenarioId, capabilities, mergeScenario } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'connector' | 'upload'>('connector');
  const [platform, setPlatform] = useState<string | null>('avaya-aura');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<UploadEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleFile = SCENARIO_SAMPLE_FILES[scenarioId] ?? DEFAULT_SAMPLE_FILE;
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

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).map((file) => ({ file, status: 'ready' as UploadStatus }));
    setFiles((prev) => [...prev, ...incoming]);
  }

  async function loadSampleFile() {
    try {
      const res = await fetch(sampleFile.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      addFiles([new File([blob], sampleFile.filename, { type: 'application/json' })]);
      showToast('Sample Avaya export added — click Parse & Discover to process it.');
    } catch {
      showToast('Could not load the sample file.');
    }
  }

  async function parseAndDiscover() {
    if (files.length === 0) {
      showToast('Add at least one file to parse first.');
      return;
    }
    setParsing(true);
    const working = [...files];
    let lastParsed: UploadResult | null = null;

    for (let i = 0; i < working.length; i++) {
      working[i] = { ...working[i], status: 'parsing' };
      setFiles([...working]);
      try {
        const formData = new FormData();
        formData.append('file', working[i].file);
        formData.append('platform', platform ?? 'avaya-aura');
        const res = await api.postFile<UploadResult>('/api/upload', formData);
        working[i] = { ...working[i], status: res.parsed ? 'parsed' : 'failed', message: res.message ?? undefined };
        if (res.parsed) lastParsed = res;
      } catch (err) {
        working[i] = {
          ...working[i],
          status: 'failed',
          message: err instanceof ApiError ? err.message : 'Upload failed.',
        };
      }
      setFiles([...working]);
    }
    setParsing(false);

    if (lastParsed) {
      mergeScenario(scenarioId, {
        discovered: lastParsed.discovered,
        inventory: lastParsed.inventory,
        gap: lastParsed.gap ?? undefined,
      });
      showToast(`Parsed ${lastParsed.inventory.length} objects — proceeding to discovery.`);
      navigate('/discovery');
    } else {
      showToast('No files parsed successfully — check the status below.');
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
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json,.xml,.vxml,.csv,.wav,.mp3,.zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            style={{
              background: dragOver ? 'var(--brand-tint-bg)' : 'var(--surface)',
              border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border-input)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 32, color: 'var(--text-muted)' }}>cloud_upload</span>
            <p style={{ fontWeight: 600, marginTop: 8 }}>Drop files or click to browse</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              XML, VXML, JSON, CSV, WAV, MP3, ZIP • Max 500MB per file
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>info</span>
            Don't have an export handy?
            <a href={sampleFile.url} download style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Download the sample Avaya export
            </a>
            or
            <button
              onClick={loadSampleFile}
              style={{ border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}
            >
              add it directly
            </button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Upload Source Files</h3>
            {files.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No files added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {files.map((entry, i) => {
                  const { icon, color } = fileIcon(entry.file.name);
                  const badge = statusBadgeFor(entry);
                  return (
                    <div key={`${entry.file.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                      <span className="material-icons-outlined" style={{ color }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.file.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(entry.file.size)}</div>
                      </div>
                      <StatusBadge label={badge.label} colors={badge.colors} />
                      <Button
                        variant="ghost"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{ padding: '4px 8px' }}
                      >
                        <span className="material-icons-outlined" style={{ fontSize: 16 }}>close</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Button variant="primary" onClick={parseAndDiscover} disabled={parsing}>
              {parsing ? 'Parsing…' : 'Parse & Discover'}
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>east</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
