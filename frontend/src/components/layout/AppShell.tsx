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

  // Top bar spans the full window width (matches the original .dc.html shell);
  // the sidebar + content row sits below it, not beside it.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumbs={breadcrumbs} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav />
        <main className="page-enter" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 'var(--page-padding)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
