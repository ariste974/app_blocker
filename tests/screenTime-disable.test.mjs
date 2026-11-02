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

test('billing access expiration disables the simulated app restrictions', async () => {
  const simulation = createScreenTimeSimulation(createMemoryStorage());
  await simulation.requestScreenTimeAuthorization();
  await simulation.saveAppSelection(JSON.stringify(['social']));
  await simulation.enableAppBlocking();
  assert.equal((await simulation.getScreenTimeSnapshot()).isBlocked, true);

  await simulation.disableAppBlocking();
  const snapshot = await simulation.getScreenTimeSnapshot();
  assert.equal(snapshot.isBlocked, false);
  assert.equal(snapshot.unlockUntil, null);
});
