// Mirrors backend/app/models/schemas.py exactly — keep in sync.

export interface Pipeline {
  done: string[];
  active: string | null;
}

export interface GapSummary {
  auto: number;
  review: number;
  unsupported: number;
  complexity: string | null;
}

export interface DiscoveredItem {
  label: string;
  count: number;
  status: string | null;
}

export interface InventoryItem {
  name: string;
  id: string;
  type: string | null;
  complexity: string | null;
  cpct: number | null;
  deps: string | null;
  status: string | null;
}

export interface MappingItem {
  sName: string;
  sType: string | null;
  tName: string | null;
  tType: string | null;
  score: number | null;
  status: string | null;
}

export interface DeployLog {
  t: string;
  ok: boolean;
  msg: string;
}

export interface TestCase {
  name: string;
  id: string;
  input: string | null;
  expected: string | null;
  latency: string | null;
  result: string | null;
}

export interface ArchComponent {
  name: string;
  type?: string | null;
  objects?: string | null;
}

export interface Architecture {
  sourceComponents?: ArchComponent[];
  targetComponents?: ArchComponent[];
  [key: string]: unknown;
}

export interface Scenario {
  name: string;
  client: string | null;
  source: string | null;
  target: string | null;
  stage: string | null;
  progress: number | null;
  pipeline: Pipeline | null;
  gap: GapSummary | null;
  discovered: DiscoveredItem[];
  inventory: InventoryItem[];
  mappings: MappingItem[];
  deployLogs: DeployLog[];
  tests: TestCase[];
  architecture: Architecture | null;
}

// Card-level summary for the Projects grid. Distinct from ScenarioSummary
// (which mirrors the backend Scenario shape) — this carries UI-only fields
// like status colors and avatars that only the Projects page renders.
export interface ProjectSummary {
  name: string;
  client: string;
  source: string;
  target: string;
  status: string;
  statusColors: [string, string];
  stage: string;
  progress: number;
  barColor: string;
  updated: string;
  avatars: string[];
  scenarioId?: ScenarioId;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  client: string | null;
  source: string | null;
  target: string | null;
  stage: string | null;
  progress: number | null;
}

export type ScenarioId = string;

export interface Dataset {
  scenarios: Record<ScenarioId, Scenario>;
}

export interface Capabilities {
  llm: boolean;
  githubDeploy: boolean;
  model: string | null;
  genesysCloud: boolean;
  amazonConnect: boolean;
}

export interface ConnectionResult {
  platform: string;
  connected: boolean;
  detail: string;
  metadata: Record<string, unknown>;
}

export interface DiscoverResult {
  scenario_id: string;
  discovered: DiscoveredItem[];
  inventory: InventoryItem[];
  gap: Partial<GapSummary>;
}

export interface UploadResult {
  filename: string;
  size: number;
  platform: string;
  parsed: boolean;
  message: string | null;
  discovered: DiscoveredItem[];
  inventory: InventoryItem[];
  gap: GapSummary | null;
}

export interface ConvertRequest {
  scenario_id: string;
  target?: string;
  instructions?: string;
}

export interface ConvertResponse {
  scenario_id: string;
  target: string | null;
  model: string;
  artifact: string;
}

export interface DeployRequest {
  repository?: string;
  branch?: string;
  directory?: string;
  commit_message?: string;
  files: Record<string, string>;
}

export interface DeployResponse {
  repository: string;
  branch: string;
  commit_url: string | null;
  committed_paths: string[];
}
