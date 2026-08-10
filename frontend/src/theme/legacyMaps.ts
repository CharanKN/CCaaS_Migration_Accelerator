// Verbatim status-color lookup tables transcribed from the original
// CCaaS Migration Suite .dc.html (stColors/sc2, qColors, dispColors,
// rvStColors, the audio-decision on/off pair, typeIcons, cxColor). These are
// FIVE separate vocabularies, not one generic tone enum — a status string
// like "Pass" only exists in STATUS_COLORS, "Good" only in QUALITY_COLORS,
// etc. Do not merge them.

export type ColorPair = [bg: string, fg: string];

/** stColors / sc2() — Discovery, Mapping, Testing, Overview's discovered list. */
export const STATUS_COLORS: Record<string, ColorPair> = {
  Parsed: ['#D1FAE5', '#065F46'],
  'Auto-mapped': ['#D1FAE5', '#065F46'],
  Mapped: ['#D1FAE5', '#065F46'],
  Pass: ['#D1FAE5', '#065F46'],
  Review: ['#FEF3C7', '#92400E'],
  '1 Warning': ['#FEF3C7', '#92400E'],
  '2 Warnings': ['#FEF3C7', '#92400E'],
  Warning: ['#FEF3C7', '#92400E'],
  Unsupported: ['#FEE2E2', '#DC2626'],
  Conflict: ['#FEE2E2', '#DC2626'],
  Fail: ['#FEE2E2', '#DC2626'],
  'Parsing...': ['#DBEAFE', '#1D4ED8'],
};
export const STATUS_COLOR_DEFAULT: ColorPair = ['#F3F4F6', '#6B7280'];
export const statusColor = (status: string | null | undefined): ColorPair =>
  (status && STATUS_COLORS[status]) || STATUS_COLOR_DEFAULT;

/** qColors — Audio Prompt quality badge (no fallback in the original). */
export const QUALITY_COLORS: Record<string, ColorPair> = {
  Good: ['#D1FAE5', '#065F46'],
  Degraded: ['#FEF3C7', '#92400E'],
  Poor: ['#FEE2E2', '#DC2626'],
};

/** dispColors — Review & Approval "Disposition" badge. */
export const DISPOSITION_COLORS: Record<string, ColorPair> = {
  Migrate: ['#D1FAE5', '#065F46'],
  Consolidate: ['#DBEAFE', '#1D4ED8'],
  Retire: ['#F3F4F6', '#6B7280'],
};

/** rvStColors — Review & Approval item "Status" badge. */
export const REVIEW_STATUS_COLORS: Record<string, ColorPair> = {
  Approved: ['#D1FAE5', '#065F46'],
  Pending: ['#FEF3C7', '#92400E'],
  Changes: ['#FEE2E2', '#DC2626'],
};

/** Audio Prompt decision button on/off triple: [bg, border, text]. */
export const AUDIO_DECISION_ON: [string, string, string] = ['#FFF7ED', '#FDBA74', '#E8612D'];
export const AUDIO_DECISION_OFF: [string, string, string] = ['white', '#EBEBEF', '#6B7280'];

/** typeIcons — object-type -> Material icon name, 'category' fallback. */
export const TYPE_ICONS: Record<string, string> = {
  Vector: 'account_tree',
  'IVR Flow': 'account_tree',
  'ICM Script': 'account_tree',
  'IRD Strategy': 'account_tree',
  'VXML App': 'graphic_eq',
  'Skill/Split': 'queue',
  'Skill Group': 'queue',
  'Virtual Queue': 'queue',
  Queue: 'queue',
  Skill: 'star',
  'Precision Queue': 'star',
  'Adjunct Route': 'integration_instructions',
  Integration: 'integration_instructions',
  'Call Type': 'phone',
  'Desktop Layout': 'dashboard_customize',
};
export const typeIcon = (type: string | null | undefined): string =>
  (type && TYPE_ICONS[type]) || 'category';

/** cxColor() — complexity-bar color threshold function. */
export function complexityColor(pct: number): string {
  if (pct > 75) return '#EF4444';
  if (pct > 40) return '#F59E0B';
  return '#10B981';
}
