const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const profile = mkdtempSync(path.join(tmpdir(), 'moreira-offline-test-'));
try {
  for (const phase of ['seed', 'verify']) {
    const env = { ...process.env, OFFLINE_TEST_PROFILE: profile, OFFLINE_TEST_PHASE: phase };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(require('electron'), [path.resolve(__dirname, '..', 'tests', 'electron-offline.cjs')], {
      env, stdio: 'inherit', timeout: 90000,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Offline ${phase} tests failed with exit code ${result.status}.`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
