import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import type { ColorPair } from '../../theme/legacyMaps';

interface ReadinessCheck {
  icon: string;
  iconColor: string;
  label: string;
  detail: string;
  status: string;
  colors: ColorPair;
}

// Verbatim static cutover-readiness list from the original — reproduced
// as-is regardless of the real scenario's discovery/mapping/test data.
const READINESS_CHECKS: ReadinessCheck[] = [
  { icon: 'check_circle', iconColor: '#10B981', label: 'All IVR flows converted', detail: '8/8 flows deployed to UAT', status: 'Complete', colors: ['#D1FAE5', '#065F46'] },
  { icon: 'check_circle', iconColor: '#10B981', label: 'Audio prompts migrated', detail: '147/147 prompts uploaded', status: 'Complete', colors: ['#D1FAE5', '#065F46'] },
  { icon: 'check_circle', iconColor: '#10B981', label: 'Queue & skill mapping', detail: 'All 24 queues, 18 skills mapped', status: 'Complete', colors: ['#D1FAE5', '#065F46'] },
  { icon: 'warning', iconColor: '#F59E0B', label: 'Test suite pass rate', detail: '36/42 tests passing (85.7%)', status: '4 Failures', colors: ['#FEF3C7', '#92400E'] },
  { icon: 'cancel', iconColor: '#EF4444', label: 'CRM integration validation', detail: 'Custom data dip needs rebuild', status: 'Blocked', colors: ['#FEE2E2', '#DC2626'] },
  { icon: 'check_circle', iconColor: '#10B981', label: 'DNIS number porting', detail: '12 numbers ready for cutover', status: 'Ready', colors: ['#D1FAE5', '#065F46'] },
];

interface Signoff {
  initials: string;
  avatarBg: string;
  name: string;
  role: string;
  approved: boolean;
}

// Verbatim static stakeholder sign-off list from the original.
const INITIAL_SIGNOFFS: Signoff[] = [
  { initials: 'RK', avatarBg: '#E8612D', name: 'Rahul Kumar', role: 'Migration Lead — EXL', approved: true },
  { initials: 'SP', avatarBg: '#3B82F6', name: 'Sarah Park', role: 'QA Lead — EXL', approved: true },
  { initials: 'JM', avatarBg: '#8B5CF6', name: 'James Miller', role: 'IT Director — Acme', approved: false },
  { initials: 'LW', avatarBg: '#10B981', name: 'Lisa Wang', role: 'VP Operations — Acme', approved: false },
];

const APPROVED_COLORS: ColorPair = ['#D1FAE5', '#065F46'];
const PENDING_COLORS: ColorPair = ['#FEF3C7', '#92400E'];

export default function Reports() {
  const { scenario } = useData();
  const { showToast } = useToast();
  const [signoffs, setSignoffs] = useState<Signoff[]>(INITIAL_SIGNOFFS);

  function markApproved(name: string) {
    setSignoffs((rows) => rows.map((r) => (r.name === name ? { ...r, approved: true } : r)));
  }

  function approveAndCutover() {
    setSignoffs((rows) => rows.map((r) => ({ ...r, approved: true })));
    showToast('Migration approved for cutover!');
  }

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Reports &amp; Sign-off</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Migration readiness, stakeholder approval, and audit trail
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={() => showToast('Export started.')}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
            Export PDF
          </Button>
          <Button
            onClick={approveAndCutover}
            style={{ background: 'var(--status-good)', color: '#fff', borderColor: 'var(--status-good)' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>check_circle</span>
            Approve &amp; Cutover
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Cutover Readiness</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {READINESS_CHECKS.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: item.iconColor }}>
                    {item.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.detail}</div>
                  </div>
                </div>
                <StatusBadge label={item.status} colors={item.colors} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Stakeholder Sign-off</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {signoffs.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: s.avatarBg,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {s.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge label={s.approved ? 'Approved' : 'Pending'} colors={s.approved ? APPROVED_COLORS : PENDING_COLORS} />
                  {!s.approved && (
                    <Button onClick={() => markApproved(s.name)}>Mark Approved</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
