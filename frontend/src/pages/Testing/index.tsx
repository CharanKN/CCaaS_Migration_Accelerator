import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { Button } from '../../components/Button';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { statusColor } from '../../theme/legacyMaps';
import type { TestCase } from '../../types/scenario';

export default function Testing() {
  const { scenario } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  const columns: DataTableColumn<TestCase>[] = [
    { key: 'name', header: 'Test Scenario', render: (row) => row.name },
    { key: 'input', header: 'Input Path', render: (row) => row.input ?? '—' },
    { key: 'expected', header: 'Expected', render: (row) => row.expected ?? '—' },
    { key: 'latency', header: 'Latency', render: (row) => row.latency ?? '—' },
    {
      key: 'result',
      header: 'Result',
      render: (row) => <StatusBadge label={row.result ?? 'Unknown'} colors={statusColor(row.result)} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Test Suite &amp; Results</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Automated IVR test execution and validation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={() => showToast('Test builder is not available in this demo environment.')}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
            New Test
          </Button>
          <Button
            onClick={() => showToast('Running all tests…')}
            style={{ background: 'var(--status-good)', color: '#fff', borderColor: 'var(--status-good)' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>play_arrow</span>
            Run All
          </Button>
        </div>
      </div>

      {/* Verbatim static summary row from the original — intentionally NOT
          derived from scenario.tests (the table below uses the real data;
          the mismatch between this row and the table is in the original too). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard icon="checklist" label="Total" value={42} tone="neutral" />
        <StatCard icon="check_circle" label="Passed" value={36} tone="good" />
        <StatCard icon="error" label="Failed" value={4} tone="bad" />
        <StatCard icon="warning" label="Warnings" value={2} tone="warn" />
        <StatCard icon="percent" label="Pass Rate" value="85.7%" tone="info" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Test Cases</h3>
        <DataTable columns={columns} rows={scenario.tests ?? []} rowKey={(row) => row.id} emptyMessage="No test cases yet." />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={() => navigate('/reports')}>
          Reports &amp; Sign-off
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>east</span>
        </Button>
      </div>
    </div>
  );
}
