import assert from 'node:assert/strict';
import test from 'node:test';

import { createScreenTimeSimulation } from '../src/lib/screenTime.simulationStore.ts';

function createMemoryStorage() {
  const values = new Map();
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

test('authorization, selection, and blocking persist across app restarts', async () => {
  const storage = createMemoryStorage();
  const firstRun = createScreenTimeSimulation(storage);

  assert.equal((await firstRun.getScreenTimeSnapshot()).simulation, true);
  assert.equal(await firstRun.requestScreenTimeAuthorization(), 2);
  await firstRun.saveAppSelection(JSON.stringify(['social', 'video']));
  await firstRun.enableAppBlocking();

  const restartedApp = createScreenTimeSimulation(storage);
  const snapshot = await restartedApp.getScreenTimeSnapshot();

  assert.equal(snapshot.authorizationStatus, 2);
  assert.equal(snapshot.selectionMetadata?.applicationCount, 2);
  assert.equal(snapshot.isBlocked, true);
});

test('a denied authorization is persisted and can later be approved', async () => {
  const simulation = createScreenTimeSimulation(createMemoryStorage());

  assert.equal(await simulation.requestScreenTimeAuthorization(false), 1);
  assert.equal((await simulation.getScreenTimeSnapshot()).authorizationStatus, 1);
  assert.equal(await simulation.requestScreenTimeAuthorization(true), 2);
});

test('a successful quiz unlocks apps for fifteen minutes, then blocking resumes', async () => {
  const storage = createMemoryStorage();
  let now = 1_800_000_000_000;
  const simulation = createScreenTimeSimulation(storage, () => now);
  await simulation.requestScreenTimeAuthorization();
  await simulation.saveAppSelection(JSON.stringify(['social']));
  await simulation.enableAppBlocking();

  const unlockUntil = await simulation.unlockAppsForQuiz(15);
  const unlocked = await simulation.getScreenTimeSnapshot();
  assert.equal(unlocked.isBlocked, false);
  assert.equal(unlocked.unlockUntil, unlockUntil);

  now += 15 * 60_000;
  const reblocked = await simulation.getScreenTimeSnapshot();
  assert.equal(reblocked.isBlocked, true);
  assert.equal(reblocked.unlockUntil, null);
});

test('invalid unlock durations and empty selections are rejected', async () => {
  const simulation = createScreenTimeSimulation(createMemoryStorage());
  await simulation.requestScreenTimeAuthorization();

  await assert.rejects(simulation.enableAppBlocking(), /Choisis au moins une catégorie/);
  await assert.rejects(simulation.unlockAppsForQuiz(5), /au moins 15 minutes/);
});
