#!/usr/bin/env node

/**
 * Real-world branch verification workflow runner
 * Demonstrates adversarial-skeptic against feat/telemetry-stream
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const TAMPER_GUARD = resolve(REPO_ROOT, 'skills/adversarial-skeptic/scripts/tamper-guard.mjs');
const USECASE_DIR = __dirname;
const UNIT_TEST = 'test/unit.test.ts';
const ADV_TEST = 'test/adversarial-skeptic.test.ts';
const ADV_TEST_PATH = resolve(USECASE_DIR, ADV_TEST);

function run(cmd, args, opts = {}) {
  const displayCmd = `${cmd} ${args.join(' ')}`;
  console.log(`\n$ ${displayCmd}`);
  const res = spawnSync(cmd, args, {
    cwd: USECASE_DIR,
    stdio: 'inherit',
    ...opts
  });
  return res.status;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Branch: feat/telemetry-stream`);
  console.log(`Target: examples/real-world-usecase/src/stream-reader.ts\n`);

  // Reset to original buggy code
  run(process.execPath, ['reset.mjs']);
  run(process.execPath, [TAMPER_GUARD, 'unlock', ADV_TEST]);

  await delay(600);

  // 1. Existing unit tests on branch pass
  console.log(`--- [1/6] Running branch unit tests ---`);
  run(process.execPath, ['--test', UNIT_TEST]);

  await delay(800);

  // 2. Skeptic tests targeting branch changes fail
  console.log(`--- [2/6] Running bulletproof tests on branch changes ---`);
  run(process.execPath, ['--test', ADV_TEST]);

  await delay(800);

  // 3. Lock the adversarial test suite
  console.log(`--- [3/6] Locking test suite with SHA-256 (read-only) ---`);
  run(process.execPath, [TAMPER_GUARD, 'lock', ADV_TEST, '--force']);

  await delay(800);

  // 4. Cheating attempt: builder weakens test
  console.log(`--- [4/6] Agent attempts to weaken tests instead of fixing code ---`);
  const originalAdvContent = readFileSync(ADV_TEST_PATH, 'utf8');
  chmodSync(ADV_TEST_PATH, 0o644);
  const weakened = originalAdvContent.replace("test('0-byte", "test.skip('0-byte");
  writeFileSync(ADV_TEST_PATH, weakened, 'utf8');
  console.log(`Agent injected test.skip on 0-byte test`);

  await delay(600);

  // 5. Verification catches cheating
  console.log(`--- [5/6] Verification checks test integrity ---`);
  run(process.execPath, [TAMPER_GUARD, 'verify', ADV_TEST]);

  await delay(800);

  // 6. Restore test and apply real fix in src/
  console.log(`--- [6/6] Restoring test suite and applying fix to src/ ---`);
  writeFileSync(ADV_TEST_PATH, originalAdvContent, 'utf8');
  run(process.execPath, ['apply-fix.mjs']);

  await delay(600);

  // Verify passing with live command
  run(process.execPath, [TAMPER_GUARD, 'verify', ADV_TEST, '--cmd', `node --test ${ADV_TEST}`]);

  await delay(600);

  // Unlock for git commit
  run(process.execPath, [TAMPER_GUARD, 'unlock', ADV_TEST]);

  // Clean up back to baseline buggy state for next run
  run(process.execPath, ['reset.mjs']);
  console.log(`\nWorkflow complete: integrity preserved, real bug fixed.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
