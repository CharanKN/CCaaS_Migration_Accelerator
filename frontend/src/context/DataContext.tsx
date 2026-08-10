import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Capabilities, Dataset, Scenario, ScenarioId } from '../types/scenario';

const DEFAULT_SCENARIO: ScenarioId = 'avaya-genesys';

interface DataContextValue {
  dataset: Dataset | null;
  capabilities: Capabilities | null;
  loading: boolean;
  scenarioId: ScenarioId;
  setScenarioId: (id: ScenarioId) => void;
  scenario: Scenario | null;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO);

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

  const value = useMemo<DataContextValue>(
    () => ({ dataset, capabilities, loading, scenarioId, setScenarioId, scenario }),
    [dataset, capabilities, loading, scenarioId, scenario],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
