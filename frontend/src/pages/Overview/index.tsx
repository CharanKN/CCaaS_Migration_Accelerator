import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { PipelineStepper } from '../../components/PipelineStepper';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { useToast } from '../../components/ToastContext';

const PIPELINE_STEPS = ['Connect', 'Discover', 'Analyze', 'Map', 'Convert', 'Deploy', 'Test', 'Cutover'];
// Verbatim from the original stepDefs — these done/active flags are static in
// the source app and don't change with the actual scenario/page.
const PIPELINE_DONE = ['Connect', 'Discover', 'Analyze'];
const PIPELINE_ACTIVE = 'Map';

const STEP_ROUTES: Record<string, string> = {
  Connect: '/connect',
  Discover: '/discovery',
  Analyze: '/discovery',
  Map: '/mapping',
  Convert: '/deploy',
  Deploy: '/deploy',
  Test: '/testing',
  Cutover: '/reports',
};

// Verbatim `recentActivity` fallback — the original never overrides this from
// scenario data (only discoveredObjects/inventory/mappings/tests/deployLogs/
// architecture get that treatment), so it's always these 3 fixed items.
const RECENT_ACTIVITY = [
  { icon: 'check_circle', bg: '#D1FAE5', color: '#10B981', text: 'Discovery completed for 8 IVR flows', time: '2h ago' },
  { icon: 'warning', bg: '#FEF3C7', color: '#F59E0B', text: '3 objects flagged for manual review', time: '3h ago' },
  { icon: 'person', bg: '#DBEAFE', color: '#3B82F6', text: 'Sarah P. approved queue mappings', time: '5h ago' },
];

export default function Overview() {
  const { scenario } = useData();
  const navigate = useNavigate();
  const { showToast } = useToast();

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{scenario.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scenario.source}</span>
            <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)' }}>
              east
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scenario.target}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--status-info-bg)',
                color: 'var(--status-info-fg)',
                marginLeft: 4,
              }}
            >
              IN PROGRESS
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => showToast('Export started — you will be notified when it is ready.')}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>
              download
            </span>
            Export
          </Button>
          <Button onClick={() => showToast('Project settings are not available in this demo environment.')}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>
              settings
            </span>
            Settings
          </Button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Migration Pipeline — {scenario.stage}</h3>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            Overall: <strong style={{ color: 'var(--brand)' }}>{scenario.progress}%</strong>
          </span>
        </div>
        <PipelineStepper
          steps={PIPELINE_STEPS}
          doneSteps={PIPELINE_DONE}
          activeStep={PIPELINE_ACTIVE}
          onStepClick={(step) => navigate(STEP_ROUTES[step] ?? '/overview')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Discovered Objects</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenario.discovered.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 13 }}>{d.label}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{d.count}</span>
                  {d.status && <StatusBadge label={d.status} />}
                </div>
              </div>
            ))}
            {scenario.discovered.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No objects discovered yet.</p>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Health Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <StatCard icon="check_circle" label="Clean" value={184} tone="good" />
            <StatCard icon="warning" label="Warnings" value={23} tone="warn" />
            <StatCard icon="error" label="Blockers" value={7} tone="bad" />
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, flex: 1 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: a.bg,
                      color: a.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-icons-outlined" style={{ fontSize: 15 }}>
                      {a.icon}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13 }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
