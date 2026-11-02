import {
  getSelectedSimulatedApps,
  SIMULATED_APPS,
} from '../features/screen-time/simulatedApps.ts';
import { UNLOCK_DURATION_MINUTES } from '../features/quiz/quiz.ts';
import {
  AUTHORIZATION,
  type AuthorizationStatus,
  type ScreenTimeService,
  type ScreenTimeSnapshot,
  type SelectionMetadata,
} from './screenTime.types.ts';

const storageKey = 'tempo.screenTime.simulation.v1';

type SimulationState = {
  authorizationStatus: AuthorizationStatus;
  selectedAppIds: string[];
  blockingEnabled: boolean;
  unlockUntil: number | null;
};

type AsyncKeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const initialState: SimulationState = {
  authorizationStatus: AUTHORIZATION.notDetermined,
  selectedAppIds: [],
  blockingEnabled: false,
  unlockUntil: null,
};

function isSimulationState(value: unknown): value is SimulationState {
  if (typeof value !== 'object' || value === null) return false;

  const state = value as Partial<SimulationState>;
  return (
    (state.authorizationStatus === AUTHORIZATION.notDetermined ||
      state.authorizationStatus === AUTHORIZATION.denied ||
      state.authorizationStatus === AUTHORIZATION.approved) &&
    Array.isArray(state.selectedAppIds) &&
    state.selectedAppIds.every(
      (id) => typeof id === 'string' && SIMULATED_APPS.some((app) => app.id === id),
    ) &&
    typeof state.blockingEnabled === 'boolean' &&
    (state.unlockUntil === null || typeof state.unlockUntil === 'number')
  );
}

function getSelectionMetadata(selectedAppIds: readonly string[]): SelectionMetadata | null {
  if (selectedAppIds.length === 0) return null;

  return {
    applicationCount: selectedAppIds.length,
    categoryCount: 0,
    webDomainCount: 0,
  };
}

export function createScreenTimeSimulation(
  storage: AsyncKeyValueStorage,
  now: () => number = Date.now,
): ScreenTimeService {
  async function readState(): Promise<SimulationState> {
    const storedState = await storage.getItem(storageKey);
    if (storedState === null) return { ...initialState };

    let parsedState: unknown;
    try {
      parsedState = JSON.parse(storedState);
    } catch {
      throw new Error('Les données Screen Time simulées sont illisibles.');
    }

    if (!isSimulationState(parsedState)) {
      throw new Error('Les données Screen Time simulées sont invalides.');
    }

    return parsedState;
  }

  async function writeState(state: SimulationState): Promise<void> {
    await storage.setItem(storageKey, JSON.stringify(state));
  }

  async function getScreenTimeSnapshot(): Promise<ScreenTimeSnapshot> {
    const state = await readState();
    const unlockUntil =
      state.unlockUntil !== null && state.unlockUntil > now() ? state.unlockUntil : null;

    return {
      authorizationStatus: state.authorizationStatus,
      selectionToken:
        state.selectedAppIds.length > 0 ? JSON.stringify(state.selectedAppIds) : null,
      selectionMetadata: getSelectionMetadata(state.selectedAppIds),
      isBlocked: state.blockingEnabled && unlockUntil === null,
      unlockUntil,
      simulation: true,
    };
  }

  return {
    isScreenTimeAvailable: () => true,
    isScreenTimeSimulation: () => true,
    getScreenTimeSnapshot,
    async requestScreenTimeAuthorization(approved = true) {
      const state = await readState();
      state.authorizationStatus = approved
        ? AUTHORIZATION.approved
        : AUTHORIZATION.denied;
      await writeState(state);
      return state.authorizationStatus;
    },
    async saveAppSelection(selectionToken) {
      const state = await readState();
      if (state.authorizationStatus !== AUTHORIZATION.approved) {
        throw new Error('Autorise d’abord Screen Time avant de choisir les apps.');
      }

      state.selectedAppIds = getSelectedSimulatedApps(selectionToken);
      await writeState(state);
    },
    async enableAppBlocking() {
      const state = await readState();
      if (state.authorizationStatus !== AUTHORIZATION.approved) {
        throw new Error('Autorise d’abord Screen Time avant d’activer le blocage.');
      }
      if (state.selectedAppIds.length === 0) {
        throw new Error('Choisis au moins une catégorie à bloquer.');
      }

      state.blockingEnabled = true;
      state.unlockUntil = null;
      await writeState(state);
    },
    async disableAppBlocking() {
      const state = await readState();
      state.blockingEnabled = false;
      state.unlockUntil = null;
      await writeState(state);
    },
    async unlockAppsForQuiz(minutes) {
      if (!Number.isInteger(minutes) || minutes < UNLOCK_DURATION_MINUTES) {
        throw new Error(
          `Le déblocage doit durer au moins ${UNLOCK_DURATION_MINUTES} minutes.`,
        );
      }

      const state = await readState();
      if (!state.blockingEnabled || state.selectedAppIds.length === 0) {
        throw new Error('Aucun blocage simulé à débloquer.');
      }

      const unlockUntil = now() + minutes * 60_000;
      state.unlockUntil = unlockUntil;
      await writeState(state);
      return unlockUntil;
    },
  };
}
