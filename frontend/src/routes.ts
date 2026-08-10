import { hasFullAccess } from './roles';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
  // Whether the DEMO role can see this item. Every other role always sees
  // everything (see hasFullAccess in roles.ts) — this flag only narrows the
  // restricted demo showcase list.
  demoVisible?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Verbatim nav list/order/icons/labels from the original .dc.html left nav
// (see plan doc for the source transcription) — do not reorder or relabel.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Migration',
    items: [
      { path: '/', label: 'Projects', icon: 'dashboard', demoVisible: true },
      { path: '/overview', label: 'Project Overview', icon: 'visibility', demoVisible: true },
      { path: '/connect', label: 'Source Connection', icon: 'cloud' },
      { path: '/discovery', label: 'Discovery', icon: 'search', demoVisible: true },
      { path: '/architecture', label: 'Architecture', icon: 'hub' },
      { path: '/dataint', label: 'Data Integrations', icon: 'webhook' },
      { path: '/vectors', label: 'Vector Analysis', icon: 'route' },
      { path: '/callflow', label: 'Call Flows', icon: 'account_tree', demoVisible: true },
      { path: '/mapping', label: 'Mapping', icon: 'swap_horiz', demoVisible: true },
      { path: '/deploy', label: 'Deployment', icon: 'rocket_launch' },
      { path: '/audio', label: 'Audio Prompts', icon: 'graphic_eq' },
      { path: '/review', label: 'Review & Approval', icon: 'fact_check' },
      { path: '/testing', label: 'Testing', icon: 'science', badge: '4', demoVisible: true },
      { path: '/reports', label: 'Reports', icon: 'assessment', demoVisible: true },
    ],
  },
  {
    title: 'Administration',
    items: [
      { path: '/admin', label: 'Super Admin', icon: 'admin_panel_settings' },
      { path: '/tenantadmin', label: 'Tenant Admin', icon: 'manage_accounts' },
      { path: '/integrations', label: 'Integrations', icon: 'extension' },
      { path: '/help', label: 'Help Center', icon: 'help_outline', demoVisible: true },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavItemVisibleForRole(item: NavItem, role: string | null): boolean {
  return hasFullAccess(role) || !!item.demoVisible;
}

// Nav groups filtered to what `role` may see, with empty groups (e.g. the
// entire Administration group for a demo user) dropped rather than shown title-only.
export function navGroupsForRole(role: string | null): NavGroup[] {
  if (hasFullAccess(role)) return NAV_GROUPS;
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.demoVisible) })).filter(
    (g) => g.items.length > 0,
  );
}

// Verbatim breadcrumb label map from the original (keyed by route). 'overview'
// is a deliberate deviation: the original hardcodes "Acme IVR Migration"
// regardless of the selected project, which would look like a bug once you
// can actually switch between real projects — we derive it from the current
// scenario name instead (see TopBar.tsx). Every other label is a static page
// name in the original and is reproduced verbatim.
export const BREADCRUMB_LABELS: Record<string, string> = {
  '/connect': 'Source Connection',
  '/discovery': 'Discovery',
  '/callflow': 'Call Flows',
  '/mapping': 'Mapping',
  '/deploy': 'Deployment',
  '/testing': 'Testing',
  '/reports': 'Reports',
  '/admin': 'Super Admin',
  '/integrations': 'Integrations',
  '/help': 'Help Center',
  '/architecture': 'System Architecture',
  '/dataint': 'Data Integrations',
  '/review': 'Review & Approval',
  '/tenantadmin': 'Tenant Admin',
  '/audio': 'Audio Prompts',
  '/vectors': 'Vector Analysis',
};

export function labelForPath(path: string): string {
  return ALL_NAV_ITEMS.find((i) => i.path === path)?.label ?? 'Projects';
}
