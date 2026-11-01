export const SIMULATED_APPS = [
  { id: 'social', name: 'Réseaux sociaux' },
  { id: 'video', name: 'Vidéos et streaming' },
  { id: 'games', name: 'Jeux' },
  { id: 'news', name: 'Actualités' },
  { id: 'shopping', name: 'Achats en ligne' },
] as const;

export type SimulatedAppId = (typeof SIMULATED_APPS)[number]['id'];
const simulatedAppIds = new Set<string>(SIMULATED_APPS.map((app) => app.id));

function isSimulatedAppId(value: unknown): value is SimulatedAppId {
  return typeof value === 'string' && simulatedAppIds.has(value);
}

export function getSelectedSimulatedApps(selectionToken: string | null): SimulatedAppId[] {
  if (!selectionToken) return [];

  let selectedIds: unknown;
  try {
    selectedIds = JSON.parse(selectionToken);
  } catch {
    throw new Error('La sélection simulée enregistrée est invalide.');
  }

  if (
    !Array.isArray(selectedIds) ||
    !selectedIds.every(isSimulatedAppId)
  ) {
    throw new Error('La sélection simulée enregistrée est invalide.');
  }

  return [...new Set(selectedIds)];
}
