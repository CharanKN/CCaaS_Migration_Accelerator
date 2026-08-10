// Mirrors backend/app/models_db/user.py Role. Kept as plain strings (not an
// enum) since the only value the frontend needs to special-case is 'demo' —
// every other role is treated identically (full access).
export const DEMO_ROLE = 'demo';

export function hasFullAccess(role: string | null): boolean {
  return role !== null && role !== DEMO_ROLE;
}
