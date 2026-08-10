import { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { DISPOSITION_COLORS, REVIEW_STATUS_COLORS } from '../../theme/legacyMaps';

type Disposition = 'Migrate' | 'Consolidate' | 'Retire';
type ReviewStatus = 'Approved' | 'Pending' | 'Changes';

interface ReviewDef {
  icon: string;
  iconColor: string;
  title: string;
  detail: string;
  disposition: Disposition;
  reviewer: string;
  status: ReviewStatus;
}

// Verbatim `rvDefs` from the original .dc.html — these 6 review items are
// fixed demo content, not derived from scenario.inventory.
const RV_DEFS: ReviewDef[] = [
  {
    icon: 'account_tree',
    iconColor: '#E8612D',
    title: 'Main IVR flow conversion',
    detail: '8 vectors → 3 parameterized Architect flows (consolidated)',
    disposition: 'Consolidate',
    reviewer: 'R. Kumar',
    status: 'Approved',
  },
  {
    icon: 'queue',
    iconColor: '#3B82F6',
    title: 'Queue & skill mapping',
    detail: '24 queues, 18 skills; levels 1-16 compressed to 0-5 proficiency',
    disposition: 'Migrate',
    reviewer: 'S. Park',
    status: 'Approved',
  },
  {
    icon: 'graphic_eq',
    iconColor: '#8B5CF6',
    title: 'Audio prompt decisions',
    detail: '98 reuse / 37 TTS / 12 re-record',
    disposition: 'Migrate',
    reviewer: 'S. Park',
    status: 'Pending',
  },
  {
    icon: 'bolt',
    iconColor: '#F59E0B',
    title: 'CRM data dip rebuild',
    detail: 'ASAI adjunct route → Data Action (web services)',
    disposition: 'Migrate',
    reviewer: 'J. Miller',
    status: 'Pending',
  },
  {
    icon: 'schedule',
    iconColor: '#10B981',
    title: 'Schedules & holiday tables',
    detail: '5 holiday tables → 2 Schedule Groups',
    disposition: 'Consolidate',
    reviewer: 'R. Kumar',
    status: 'Approved',
  },
  {
    icon: 'delete_outline',
    iconColor: '#6B7280',
    title: 'Legacy fax vectors',
    detail: '4 unused vectors — no traffic in 12 months (CMS)',
    disposition: 'Retire',
    reviewer: 'R. Kumar',
    status: 'Changes',
  },
];

export default function Review() {
  const { scenario } = useData();
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<ReviewStatus[]>(() => RV_DEFS.map((d) => d.status));

  const counts = useMemo(
    () => ({
      approved: statuses.filter((s) => s === 'Approved').length,
      pending: statuses.filter((s) => s === 'Pending').length,
      changes: statuses.filter((s) => s === 'Changes').length,
    }),
    [statuses],
  );

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  function setItemStatus(index: number, status: ReviewStatus) {
    setStatuses((prev) => prev.map((s, i) => (i === index ? status : s)));
    showToast(status === 'Approved' ? 'Item approved' : 'Changes requested');
  }

  function approveAllAndPublish() {
    setStatuses(RV_DEFS.map(() => 'Approved'));
    showToast('All items approved — publishing to target');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Review &amp; Approval</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Manual review gate — all items must be approved before publishing to {scenario.target}
          </p>
        </div>
        <button
          onClick={() => showToast('Changes requested for this migration batch.')}
          style={{
            padding: '9px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid #DC2626',
            background: 'transparent',
            color: '#DC2626',
            cursor: 'pointer',
          }}
        >
          Request Changes
        </button>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{counts.approved}</strong> approved
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{counts.pending}</strong> pending
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{counts.changes}</strong> changes requested
        </span>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Disposition:</span>
        <StatusBadge label="Migrate" colors={DISPOSITION_COLORS.Migrate} />
        <StatusBadge label="Consolidate" colors={DISPOSITION_COLORS.Consolidate} />
        <StatusBadge label="Retire" colors={DISPOSITION_COLORS.Retire} />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Near-duplicate vectors are consolidated into parameterized flows driven by Data Tables
        </span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {RV_DEFS.map((def, i) => {
            const status = statuses[i];
            return (
              <div
                key={def.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom: i < RV_DEFS.length - 1 ? '1px solid var(--divider)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: 'var(--radius-md)',
                    background: `${def.iconColor}1a`,
                    color: def.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: 18 }}>
                    {def.icon}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{def.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{def.detail}</div>
                </div>
                <div style={{ width: 120 }}>
                  <StatusBadge label={def.disposition} colors={DISPOSITION_COLORS[def.disposition]} />
                </div>
                <div style={{ width: 100, fontSize: 12, color: 'var(--text-secondary)' }}>{def.reviewer}</div>
                <div style={{ width: 100 }}>
                  <StatusBadge label={status} colors={REVIEW_STATUS_COLORS[status]} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button onClick={() => setItemStatus(i, 'Approved')}>Approve</Button>
                  <Button variant="ghost" onClick={() => setItemStatus(i, 'Changes')}>
                    Changes
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={approveAllAndPublish}
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: 'var(--shadow-cta)' }}
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            done_all
          </span>
          Approve All &amp; Publish
        </Button>
      </div>
    </div>
  );
}
