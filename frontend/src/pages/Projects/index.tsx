import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastContext';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import type { ProjectSummary, Scenario } from '../../types/scenario';

// Source/target platform choices offered in the "New Project" wizard — mirrors
// the platform vocabulary used on the Connect page.
const SOURCE_PLATFORMS = ['Avaya Aura', 'Avaya CMS', 'Cisco UCCE', 'Genesys Engage', 'Mitel / Unify', 'PureConnect'];
const TARGET_PLATFORMS = ['Amazon Connect', 'Genesys Cloud', 'Five9', 'Twilio Flex'];
const NEW_PROJECT_BAR_COLOR = '#E8612D';

// Slugify a project name into a scenario id, tie-broken with a short random
// suffix so two projects with the same name don't collide.
function slugify(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'project'}-${suffix}`;
}

function initialsFor(email: string | null): string[] {
  if (!email) return ['YOU'];
  const name = email.split('@')[0] ?? email;
  const parts = name.split(/[._-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return [initials || name.slice(0, 2).toUpperCase()];
}

export default function Projects() {
  const { setScenarioId, addScenario, projects, addProject } = useData();
  const { email } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    client: '',
    source: SOURCE_PLATFORMS[0],
    target: TARGET_PLATFORMS[0],
  });

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const statCards = [
    { label: 'Total Projects', value: String(projects.length), icon: 'folder', tone: 'neutral' as const, trend: '↑ live count' },
    {
      label: 'In Progress',
      value: String(projects.filter((p) => p.status === 'In Progress').length),
      icon: 'sync',
      tone: 'info' as const,
      trend: 'Active migrations',
    },
    {
      label: 'Completed',
      value: String(projects.filter((p) => p.status === 'Completed').length),
      icon: 'check_circle',
      tone: 'good' as const,
      trend: '100% success rate',
    },
    { label: 'Objects Migrated', value: '2,847', icon: 'inventory_2', tone: 'neutral' as const, trend: 'Across all projects' },
  ];

  function openProject(p: ProjectSummary) {
    if (p.scenarioId) setScenarioId(p.scenarioId);
    navigate('/overview');
  }

  function createProject() {
    const name = form.name.trim();
    const client = form.client.trim();
    if (!name || !client) {
      showToast('Give the project a name and a client before creating it.');
      return;
    }
    const scenarioId = slugify(name);
    const newScenario: Scenario = {
      name,
      client,
      source: form.source,
      target: form.target,
      stage: 'Discovery',
      progress: 0,
      pipeline: { done: [], active: 'connect' },
      gap: null,
      discovered: [],
      inventory: [],
      mappings: [],
      deployLogs: [],
      tests: [],
      architecture: null,
    };
    const newCard: ProjectSummary = {
      name,
      client,
      source: form.source,
      target: form.target,
      status: 'In Progress',
      statusColors: ['#DBEAFE', '#1D4ED8'],
      stage: 'Discovery',
      progress: 0,
      barColor: NEW_PROJECT_BAR_COLOR,
      updated: 'Just now',
      avatars: initialsFor(email),
      scenarioId,
    };

    addScenario(scenarioId, newScenario);
    addProject(newCard);
    setScenarioId(scenarioId);
    setShowCreate(false);
    setForm({ name: '', client: '', source: SOURCE_PLATFORMS[0], target: TARGET_PLATFORMS[0] });
    showToast(`"${name}" created.`);
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
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          New Project
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        {statCards.map((s) => (
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

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Migration Project"
        footer={
          <>
            <Button onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={createProject}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
              Create Project
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Project Name
            <input
              autoFocus
              placeholder="e.g. Northbridge IVR Migration"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Client Name
            <input
              placeholder="e.g. Northbridge Utilities"
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Source Platform
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
              >
                {SOURCE_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Target Platform
              <select
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input)' }}
              >
                {TARGET_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Creates a new project and opens its overview — ready for discovery, mapping, and the rest of the pipeline.
          </p>
        </div>
      </Modal>
    </div>
  );
}
