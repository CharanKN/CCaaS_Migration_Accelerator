import { Outlet, useLocation } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { BREADCRUMB_LABELS } from '../../routes';
import { useData } from '../../context/DataContext';

export function AppShell() {
  const location = useLocation();
  const { scenario } = useData();

  // Deviation from the original (which hardcodes "Acme IVR Migration" here
  // regardless of the selected project): show the real current scenario name
  // since users can actually switch projects in this build. See routes.ts.
  const currentLabel =
    location.pathname === '/overview'
      ? scenario?.name ?? 'Project Overview'
      : BREADCRUMB_LABELS[location.pathname];

  const breadcrumbs =
    location.pathname === '/' || !currentLabel
      ? [{ label: 'Projects' }]
      : [{ label: 'Projects', to: '/' }, { label: currentLabel }];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <SideNav />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopBar breadcrumbs={breadcrumbs} />
        <main className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: 'var(--page-padding)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
