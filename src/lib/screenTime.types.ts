export type AuthorizationStatus = 0 | 1 | 2;

export type SelectionMetadata = {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};

export type ScreenTimeSnapshot = {
  authorizationStatus: AuthorizationStatus;
  selectionToken: string | null;
  selectionMetadata: SelectionMetadata | null;
  isBlocked: boolean;
  unlockUntil: number | null;
  simulation: boolean;
};

export const AUTHORIZATION = {
  notDetermined: 0,
  denied: 1,
  approved: 2,
} as const;

export type ScreenTimeService = {
  isScreenTimeAvailable: () => boolean;
  isScreenTimeSimulation: () => boolean;
  getScreenTimeSnapshot: () => Promise<ScreenTimeSnapshot>;
  requestScreenTimeAuthorization: (approved?: boolean) => Promise<AuthorizationStatus>;
  saveAppSelection: (selectionToken: string) => Promise<void>;
  enableAppBlocking: () => Promise<void>;
  disableAppBlocking: () => Promise<void>;
  unlockAppsForQuiz: (minutes: number) => Promise<number>;
};
