import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import type { ScenarioId } from '../../types/scenario';

// Verbatim from the original .dc.html `statCards` literal array — these are
// fixed illustrative numbers in the original, not derived from the dataset.
const STAT_CARDS = [
  { label: 'Total Projects', value: '12', icon: 'folder', tone: 'neutral' as const, trend: '↑ 3 this quarter' },
  { label: 'In Progress', value: '5', icon: 'sync', tone: 'info' as const, trend: 'Active migrations' },
  { label: 'Completed', value: '6', icon: 'check_circle', tone: 'good' as const, trend: '100% success rate' },
  { label: 'Objects Migrated', value: '2,847', icon: 'inventory_2', tone: 'neutral' as const, trend: 'Across all projects' },
];

interface ProjectCardDef {
  name: string;
  client: string;
  source: string;
  target: string;
  status: string;
  statusColors: [string, string];
  stage: string;
  progress: number;
  barColor: string;
  updated: string;
  avatars: string[];
  scenarioId?: ScenarioId;
}

// Verbatim from the original `projects` literal array. Two cards (HealthFirst,
// InsureCo) don't set a scenario in the original either — they just navigate
// to Overview showing whatever project was last selected. Reproduced as-is.
const PROJECTS: ProjectCardDef[] = [
  {
    name: 'Acme IVR Migration',
    client: 'Acme Financial Corp',
    source: 'Avaya Aura',
    target: 'Genesys Cloud',
    status: 'In Progress',
    statusColors: ['#DBEAFE', '#1D4ED8'],
    stage: 'Mapping Phase',
    progress: 62,
    barColor: '#E8612D',
    updated: '2h ago',
    avatars: ['RK', 'SP'],
    scenarioId: 'avaya-genesys',
  },
  {
    name: 'TeleCorp Cloud Migration',
    client: 'TeleCorp Insurance',
    source: 'Cisco UCCE',
    target: 'Amazon Connect',
    status: 'In Progress',
    statusColors: ['#DBEAFE', '#1D4ED8'],
    stage: 'Discovery',
    progress: 35,
    barColor: '#3B82F6',
    updated: '5h ago',
    avatars: ['AM', 'JD'],
    scenarioId: 'cisco-connect',
  },
  {
    name: 'GlobalBank Modernization',
    client: 'GlobalBank Holdings',
    source: 'Genesys Engage',
    target: 'Genesys Cloud',
    status: 'Completed',
    statusColors: ['#D1FAE5', '#065F46'],
    stage: 'Cutover Done',
    progress: 100,
    barColor: '#10B981',
    updated: '3d ago',
    avatars: ['NK', 'PR'],
    scenarioId: 'engage-genesys',
  },
  {
    name: 'HealthFirst CC',
    client: 'HealthFirst Inc',
    source: 'Avaya CMS',
    target: 'Five9',
    status: 'In Progress',
    statusColors: ['#DBEAFE', '#1D4ED8'],
    stage: 'Testing',
    progress: 78,
    barColor: '#E8612D',
    updated: '1h ago',
    avatars: ['KL', 'MV'],
  },
  {
    name: 'RetailMax Omnichannel',
    client: 'RetailMax Corp',
    source: 'Mitel',
    target: 'Twilio Flex',
    status: 'On Hold',
    statusColors: ['#FEF3C7', '#92400E'],
    stage: 'Pending Approval',
    progress: 15,
    barColor: '#F59E0B',
    updated: '1w ago',
    avatars: ['TS', 'RG'],
    scenarioId: 'mitel-twilio',
  },
  {
    name: 'InsureCo IVR Redesign',
    client: 'InsureCo Ltd',
    source: 'PureConnect',
    target: 'Amazon Connect',
    status: 'In Progress',
    statusColors: ['#DBEAFE', '#1D4ED8'],
    stage: 'Conversion',
    progress: 55,
    barColor: '#8B5CF6',
    updated: '4h ago',
    avatars: ['DS', 'LP'],
  },
];

export default function Projects() {
  const { setScenarioId } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = PROJECTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function openProject(p: ProjectCardDef) {
    if (p.scenarioId) setScenarioId(p.scenarioId);
    navigate('/overview');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Migration Projects</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Track and manage all CCaaS migration initiatives
          </p>
        </div>
        <Button variant="primary" onClick={() => showToast('Project creation is not available in this demo environment.')}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          New Project
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        {STAT_CARDS.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} trend={s.trend} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 320,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-input)',
          }}
        />
        {/* Decorative in the original — present but not wired to filtering. */}
        <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}>
          <option>All Statuses</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>On Hold</option>
        </select>
        <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}>
          <option>All Platforms</option>
          <option>Avaya</option>
          <option>Cisco</option>
          <option>Genesys</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
        {filtered.map((p) => (
          <div
            key={p.name}
            onClick={() => openProject(p)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              cursor: 'pointer',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.client}</div>
              </div>
              <StatusBadge label={p.status} colors={p.statusColors} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>
              <span>{p.source}</span>
              <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)' }}>
                east
              </span>
              <span>{p.target}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 14, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{p.stage}</span>
              <span style={{ fontWeight: 600 }}>{p.progress}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${p.progress}%`, height: '100%', background: p.barColor }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span className="material-icons-outlined" style={{ fontSize: 14 }}>
                  schedule
                </span>
                Updated {p.updated}
              </div>
              <div style={{ display: 'flex' }}>
                {p.avatars.map((a, i) => (
                  <div
                    key={a}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--navy)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--surface)',
                      marginLeft: i === 0 ? 0 : -6,
                    }}
                  >
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No projects match "{search}".</p>}
      </div>
    </div>
  );
}
