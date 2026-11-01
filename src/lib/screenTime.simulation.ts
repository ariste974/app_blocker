import AsyncStorage from '@react-native-async-storage/async-storage';

import { createScreenTimeSimulation } from './screenTime.simulationStore';

export { createScreenTimeSimulation } from './screenTime.simulationStore';

const simulation = createScreenTimeSimulation(AsyncStorage);

export const isScreenTimeAvailable = simulation.isScreenTimeAvailable;
export const isScreenTimeSimulation = simulation.isScreenTimeSimulation;
export const getScreenTimeSnapshot = simulation.getScreenTimeSnapshot;
export const requestScreenTimeAuthorization = simulation.requestScreenTimeAuthorization;
export const saveAppSelection = simulation.saveAppSelection;
export const enableAppBlocking = simulation.enableAppBlocking;
export const unlockAppsForQuiz = simulation.unlockAppsForQuiz;
