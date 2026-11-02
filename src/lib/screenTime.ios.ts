import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceActivitySchedule } from 'react-native-device-activity';

import { UNLOCK_DURATION_MINUTES } from '../features/quiz/quiz';
import { createScreenTimeSimulation } from './screenTime.simulationStore';
import type {
  AuthorizationStatus,
  ScreenTimeService,
  ScreenTimeSnapshot,
  SelectionMetadata,
} from './screenTime.types';
import { getDeviceActivityModule } from './deviceActivityModule.ios';

export { AUTHORIZATION } from './screenTime.types';

const selectionId = 'tempo-block-selection';
const blockActivityName = `${selectionId}-daily`;
const unlockActivityName = `${selectionId}-quiz-unlock`;
const unlockUntilKey = 'tempo.unlockUntil';
const simulation = createScreenTimeSimulation(AsyncStorage);

function getNativeModule() {
  const module = getDeviceActivityModule();
  return module?.isAvailable() ? module : null;
}

function getSelectionToken(
  deviceActivity: NonNullable<ReturnType<typeof getNativeModule>>,
): string | null {
  return deviceActivity.getFamilyActivitySelectionId(selectionId) ?? null;
}

function getSelectionMetadata(
  deviceActivity: NonNullable<ReturnType<typeof getNativeModule>>,
  token: string | null,
): SelectionMetadata | null {
  if (!token) return null;

  const metadata = deviceActivity.activitySelectionMetadata({
    activitySelectionToken: token,
  });
  if (!metadata) return null;

  return {
    applicationCount: metadata.applicationCount,
    categoryCount: metadata.categoryCount,
    webDomainCount: metadata.webDomainCount,
  };
}

function selectionHasTargets(metadata: SelectionMetadata | null): boolean {
  return Boolean(
    metadata &&
      metadata.applicationCount + metadata.categoryCount + metadata.webDomainCount > 0,
  );
}

function dateComponents(date: Date): DeviceActivitySchedule['intervalStart'] {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    timeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

const nativeService: ScreenTimeService = {
  isScreenTimeAvailable: () => true,
  isScreenTimeSimulation: () => getNativeModule() === null,
  async getScreenTimeSnapshot(): Promise<ScreenTimeSnapshot> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.getScreenTimeSnapshot();

    const authorizationStatus = deviceActivity.getAuthorizationStatus();
    const selectionToken = getSelectionToken(deviceActivity);
    const selectionMetadata = getSelectionMetadata(deviceActivity, selectionToken);
    let unlockUntil = deviceActivity.userDefaultsGet<number>(unlockUntilKey) ?? null;

    if (
      authorizationStatus === deviceActivity.AuthorizationStatus.approved &&
      unlockUntil !== null &&
      unlockUntil <= Date.now()
    ) {
      if (selectionHasTargets(selectionMetadata)) {
        deviceActivity.blockSelection({ activitySelectionId: selectionId });
      }
      deviceActivity.userDefaultsRemove(unlockUntilKey);
      unlockUntil = null;
    }

    return {
      authorizationStatus,
      selectionToken,
      selectionMetadata,
      isBlocked: deviceActivity.isShieldActive(),
      unlockUntil,
      simulation: false,
    };
  },
  async requestScreenTimeAuthorization(
    approved?: boolean,
  ): Promise<AuthorizationStatus> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.requestScreenTimeAuthorization(approved);

    await deviceActivity.requestAuthorization('individual');
    return deviceActivity.pollAuthorizationStatus();
  },
  async saveAppSelection(selectionToken: string): Promise<void> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.saveAppSelection(selectionToken);

    deviceActivity.setFamilyActivitySelectionId({
      id: selectionId,
      familyActivitySelection: selectionToken,
    });

    if (deviceActivity.isShieldActive()) {
      deviceActivity.blockSelection({ activitySelectionId: selectionId });
    }
  },
  async enableAppBlocking(): Promise<void> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.enableAppBlocking();

    const selectionMetadata = getSelectionMetadata(
      deviceActivity,
      getSelectionToken(deviceActivity),
    );
    if (!selectionHasTargets(selectionMetadata)) {
      throw new Error('Choisis au moins une app, catégorie ou un site à bloquer.');
    }

    deviceActivity.updateShield(
      {
        title: 'Une pause, ça fait du bien.',
        subtitle: 'Réponds au quiz Tempo pour retrouver tes apps.',
        primaryButtonLabel: 'Faire le quiz',
        secondaryButtonLabel: 'Fermer',
        iconSystemName: 'hourglass',
        backgroundColor: { red: 26, green: 61, blue: 52, alpha: 1 },
        titleColor: { red: 255, green: 255, blue: 255, alpha: 1 },
        subtitleColor: { red: 225, green: 235, blue: 228, alpha: 1 },
        primaryButtonLabelColor: { red: 26, green: 61, blue: 52, alpha: 1 },
        primaryButtonBackgroundColor: { red: 217, green: 242, blue: 124, alpha: 1 },
      },
      {
        primary: {
          behavior: 'close',
          actions: [
            {
              type: 'sendNotification',
              payload: {
                title: 'Tempo',
                body: 'Touche cette notification pour répondre au quiz.',
                userInfo: { url: 'tempo://quiz' },
              },
            },
          ],
        },
        secondary: {
          behavior: 'close',
          type: 'dismiss',
        },
      },
    );

    const allDaySchedule: DeviceActivitySchedule = {
      intervalStart: { hour: 0, minute: 0 },
      intervalEnd: { hour: 23, minute: 59 },
      repeats: true,
    };
    deviceActivity.stopMonitoring([blockActivityName]);

    try {
      await deviceActivity.startMonitoring(blockActivityName, allDaySchedule, []);
      deviceActivity.userDefaultsRemove(unlockUntilKey);
      deviceActivity.blockSelection({ activitySelectionId: selectionId });
    } catch (error) {
      deviceActivity.stopMonitoring([blockActivityName]);
      throw error;
    }
  },
  async disableAppBlocking(): Promise<void> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.disableAppBlocking();

    deviceActivity.stopMonitoring([blockActivityName, unlockActivityName]);
    deviceActivity.unblockSelection({ activitySelectionId: selectionId });
    deviceActivity.userDefaultsRemove(unlockUntilKey);
  },
  async unlockAppsForQuiz(minutes: number): Promise<number> {
    const deviceActivity = getNativeModule();
    if (!deviceActivity) return simulation.unlockAppsForQuiz(minutes);
    if (!Number.isInteger(minutes) || minutes < UNLOCK_DURATION_MINUTES) {
      throw new Error(
        `Le déblocage doit durer au moins ${UNLOCK_DURATION_MINUTES} minutes.`,
      );
    }
    if (
      !selectionHasTargets(
        getSelectionMetadata(deviceActivity, getSelectionToken(deviceActivity)),
      )
    ) {
      throw new Error('Aucune sélection Screen Time à débloquer.');
    }

    const startsAt = new Date();
    startsAt.setSeconds(0, 0);
    const unlockUntil = startsAt.getTime() + minutes * 60_000;
    const schedule: DeviceActivitySchedule = {
      intervalStart: dateComponents(startsAt),
      intervalEnd: dateComponents(new Date(unlockUntil)),
      repeats: false,
    };

    deviceActivity.stopMonitoring([unlockActivityName]);
    deviceActivity.configureActions({
      activityName: unlockActivityName,
      callbackName: 'intervalDidEnd',
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: selectionId,
        },
      ],
    });

    try {
      await deviceActivity.startMonitoring(unlockActivityName, schedule, []);
      deviceActivity.unblockSelection({ activitySelectionId: selectionId });
      deviceActivity.userDefaultsSet(unlockUntilKey, unlockUntil);
      return unlockUntil;
    } catch (error) {
      deviceActivity.stopMonitoring([unlockActivityName]);
      deviceActivity.blockSelection({ activitySelectionId: selectionId });
      throw error;
    }
  },
};

export const isScreenTimeAvailable = nativeService.isScreenTimeAvailable;
export const isScreenTimeSimulation = nativeService.isScreenTimeSimulation;
export const getScreenTimeSnapshot = nativeService.getScreenTimeSnapshot;
export const requestScreenTimeAuthorization =
  nativeService.requestScreenTimeAuthorization;
export const saveAppSelection = nativeService.saveAppSelection;
export const enableAppBlocking = nativeService.enableAppBlocking;
export const disableAppBlocking = nativeService.disableAppBlocking;
export const unlockAppsForQuiz = nativeService.unlockAppsForQuiz;
