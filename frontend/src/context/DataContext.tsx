import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Capabilities, Dataset, ProjectSummary, Scenario, ScenarioId } from '../types/scenario';

const DEFAULT_SCENARIO: ScenarioId = 'avaya-genesys';

// Verbatim from the original `projects` literal array, plus the Avaya ->
// Amazon Connect card below (additive). Two cards (HealthFirst, InsureCo)
// don't set a scenario in the original either — they just navigate to
// Overview showing whatever project was last selected. Reproduced as-is.
// Lives here (not the Projects page) so it survives navigating away and back.
const INITIAL_PROJECTS: ProjectSummary[] = [
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
  {
    name: 'Avaya to Amazon Connect Migration',
    client: 'Meridian Financial Group',
    source: 'Avaya Aura',
    target: 'Amazon Connect',
    status: 'In Progress',
    statusColors: ['#DBEAFE', '#1D4ED8'],
    stage: 'Mapping Phase',
    progress: 64,
    barColor: '#F59E0B',
    updated: '6h ago',
    avatars: ['MK', 'JT'],
    scenarioId: 'avaya-connect',
  },
];

interface DataContextValue {
  dataset: Dataset | null;
  capabilities: Capabilities | null;
  loading: boolean;
  scenarioId: ScenarioId;
  setScenarioId: (id: ScenarioId) => void;
  scenario: Scenario | null;
  mergeScenario: (id: ScenarioId, patch: Partial<Scenario>) => void;
  addScenario: (id: ScenarioId, scenario: Scenario) => void;
  projects: ProjectSummary[];
  addProject: (project: ProjectSummary) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [projects, setProjects] = useState<ProjectSummary[]>(INITIAL_PROJECTS);

  useEffect(() => {
    let cancelled = false;

    async function loadDataset() {
      try {
        const data = await api.get<Dataset>('/api/dataset');
        if (!cancelled) setDataset(data);
      } catch {
        try {
          const res = await fetch('/data/demo-data.json');
          if (res.ok) {
            const data = (await res.json()) as Dataset;
            if (!cancelled) setDataset(data);
          }
        } catch {
          // No backend and no bundled fallback reachable — leave dataset null.
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadCapabilities() {
      try {
        const caps = await api.get<Capabilities>('/api/capabilities');
        if (!cancelled) setCapabilities(caps);
      } catch {
        // Capabilities are advisory only — safe to ignore failures.
      }
    }

    loadDataset();
    loadCapabilities();
    return () => {
      cancelled = true;
    };
  }, []);

  const scenario = dataset?.scenarios[scenarioId] ?? null;

  function mergeScenario(id: ScenarioId, patch: Partial<Scenario>) {
    setDataset((prev) => {
      const existing = prev?.scenarios[id];
      if (!prev || !existing) return prev;
      return { ...prev, scenarios: { ...prev.scenarios, [id]: { ...existing, ...patch } } };
    });
  }

  // Client-side project creation for the demo showcase — inserts a brand-new
  // scenario so a freshly created project has somewhere to route its data.
  function addScenario(id: ScenarioId, newScenario: Scenario) {
    setDataset((prev) => {
      const base = prev ?? { scenarios: {} };
      return { ...base, scenarios: { ...base.scenarios, [id]: newScenario } };
    });
  }

  // Client-side project creation for the demo showcase — appends to the
  // Projects grid, kept here (not local page state) so it survives navigation.
  function addProject(project: ProjectSummary) {
    setProjects((prev) => [project, ...prev]);
  }

  const value = useMemo<DataContextValue>(
    () => ({ dataset, capabilities, loading, scenarioId, setScenarioId, scenario, mergeScenario, addScenario, projects, addProject }),
    [dataset, capabilities, loading, scenarioId, scenario, projects],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
