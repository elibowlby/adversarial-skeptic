#!/usr/bin/env node

/**
 * demo-simulation.mjs
 * 
 * Interactive 5-second simulation: "Catch the Agent Cheating"
 * Demonstrates tamper-guard.mjs catching an AI coding agent attempting to:
 * 1. Weaken adversarial tests (chmod +w, inject test.skip, delete failing assertions)
 * 2. Forge .adversarial-lock.json to bypass cryptographic verification
 * 3. Legitimate resolution and clean unlock
 * 
 * Zero external dependencies.
 */

import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const TAMPER_GUARD = resolve(REPO_ROOT, 'skills/adversarial-skeptic/scripts/tamper-guard.mjs');

// ANSI escape codes for crisp terminal presentation
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

function banner(step, title) {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}[STEP ${step}/5] ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);
}

function subtext(text) {
  console.log(`${DIM}🤖 ${text}${RESET}\n`);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 11 realistic test cases representing real-world adversarial edge cases
const ORIGINAL_11_TESTS = `import test from 'node:test';
import assert from 'node:assert';

test('vector-1: 0-byte input handling returns empty batch without crash', () => {
  assert.ok(true);
});

test('vector-1: literal "null" and "[]" NDJSON lines ignored gracefully', () => {
  assert.ok(true);
});

test('vector-1: mid-stream truncated 4-byte UTF-8 emoji chunks preserved', () => {
  assert.ok(true);
});

test('vector-1: 100MB burst log streaming maintains bounded heap memory', () => {
  assert.ok(true);
});

test('vector-2: circular parent UUID DAG cycles detect recursion error', () => {
  assert.ok(true);
});

test('vector-2: orphaned child references pruned on cascade deletion', () => {
  assert.ok(true);
});

test('vector-3: ISO-8601 timestamps normalize +02:00 / -11:00 offsets to UTC', () => {
  assert.ok(true);
});

test('vector-3: Windows CRLF (\\r\\n) line endings parsed without trailing carriage returns', () => {
  assert.ok(true);
});

test('vector-4: concurrent multi-tenant cache state remains strictly isolated', () => {
  assert.ok(true);
});

test('vector-5: multiline PEM RSA private key completely redacted in logger', () => {
  assert.ok(true);
});

test('vector-5: shell metacharacter injection prevented via array dispatch', () => {
  assert.ok(true);
});
`;

// Weakened test suite: agent deleted 1 test and marked 1 with test.skip (11 -> 9 active tests)
const WEAKENED_9_TESTS = `import test from 'node:test';
import assert from 'node:assert';

test('vector-1: 0-byte input handling returns empty batch without crash', () => {
  assert.ok(true);
});

test('vector-1: literal "null" and "[]" NDJSON lines ignored gracefully', () => {
  assert.ok(true);
});

test('vector-1: mid-stream truncated 4-byte UTF-8 emoji chunks preserved', () => {
  assert.ok(true);
});

test('vector-1: 100MB burst log streaming maintains bounded heap memory', () => {
  assert.ok(true);
});

test.skip('vector-2: circular parent UUID DAG cycles detect recursion error', () => {
  assert.ok(true);
});

test('vector-3: ISO-8601 timestamps normalize +02:00 / -11:00 offsets to UTC', () => {
  assert.ok(true);
});

test('vector-3: Windows CRLF (\\r\\n) line endings parsed without trailing carriage returns', () => {
  assert.ok(true);
});

test('vector-4: concurrent multi-tenant cache state remains strictly isolated', () => {
  assert.ok(true);
});

test('vector-5: multiline PEM RSA private key completely redacted in logger', () => {
  assert.ok(true);
});

test('vector-5: shell metacharacter injection prevented via array dispatch', () => {
  assert.ok(true);
});
`;

async function runDemo() {
  console.log(`${BOLD}⚡ ADVERSARIAL SKEPTIC: "CATCH THE AGENT CHEATING" LIVE SIMULATION${RESET}`);
  console.log(`${DIM}Target: Autonomous AI Coding Agent attempting to bypass failing edge cases${RESET}`);

  // Setup isolated temporary workspace
  const tempDir = mkdtempSync(resolve(os.tmpdir(), 'adv-skeptic-demo-'));
  const testFileName = 'adversarial-skeptic.test.ts';
  const testFilePath = resolve(tempDir, testFileName);

  try {
    writeFileSync(testFilePath, ORIGINAL_11_TESTS, 'utf8');

    // -------------------------------------------------------------------------
    // STEP 1: Lock the Test Suite
    // -------------------------------------------------------------------------
    banner(1, 'Adversarial Skeptic Engages Cryptographic Lock');
    subtext('Empty-Backpack Skeptic generated 11 adversarial tests and locks them read-only...');
    await delay(500);

    const lockProc = spawnSync(process.execPath, [TAMPER_GUARD, 'lock', testFileName], {
      cwd: tempDir,
      stdio: 'inherit'
    });
    if (lockProc.status !== 0) throw new Error('Lock failed in demo setup');

    await delay(700);

    // -------------------------------------------------------------------------
    // STEP 2: Simulate Frustrated Builder Agent Cheating
    // -------------------------------------------------------------------------
    banner(2, 'Builder Agent Encounters Failing Tests & Attempts to Cheat');
    subtext('Builder agent cannot figure out the DAG cycle and shell injection fixes.');
    console.log(`${YELLOW}Builder Action: chmod +w ${testFileName}${RESET}`);
    console.log(`${YELLOW}Builder Action: Injected test.skip on circular DAG test${RESET}`);
    console.log(`${YELLOW}Builder Action: Deleted failing assertion (11 -> 9 active tests)${RESET}\n`);

    // Builder circumvents read-only file permissions
    chmodSync(testFilePath, 0o644);
    writeFileSync(testFilePath, WEAKENED_9_TESTS, 'utf8');

    await delay(700);

    // -------------------------------------------------------------------------
    // STEP 3: Verification Detects Tampering
    // -------------------------------------------------------------------------
    banner(3, 'Pre-Commit / CI Runs tamper-guard verify');
    subtext('tamper-guard recomputes SHA-256 and AST test counts against .adversarial-lock.json...');
    await delay(500);

    const verifyTamper = spawnSync(process.execPath, [TAMPER_GUARD, 'verify', testFileName], {
      cwd: tempDir,
      stdio: 'inherit'
    });
    console.log(`${RED}${BOLD}>> Result: Process exited with code ${verifyTamper.status} (TAMPER DETECTED)${RESET}`);

    await delay(700);

    // -------------------------------------------------------------------------
    // STEP 4: Builder Attempts Lockfile Forgery
    // -------------------------------------------------------------------------
    banner(4, 'Builder Agent Attempts Lockfile Forgery');
    subtext('Clever agent tries overwriting .adversarial-lock.json with fake hash to bypass verification...');
    console.log(`${YELLOW}Builder Action: Rewriting .adversarial-lock.json to match weakened test file...${RESET}\n`);

    const fakeLockFile = resolve(tempDir, '.adversarial-lock.json');
    chmodSync(fakeLockFile, 0o644);
    writeFileSync(fakeLockFile, JSON.stringify({
      version: '1.0.0',
      lockedAt: new Date().toISOString(),
      targetFile: testFileName,
      targetFileResolved: testFilePath,
      sha256: 'forged_fake_hash_1234567890abcdef',
      testCount: 9
    }, null, 2) + '\n', 'utf8');

    await delay(500);
    subtext('tamper-guard cross-checks against isolated out-of-workspace shadow lock in os.tmpdir()...');

    const verifyForgery = spawnSync(process.execPath, [TAMPER_GUARD, 'verify', testFileName], {
      cwd: tempDir,
      stdio: 'inherit'
    });
    console.log(`${RED}${BOLD}>> Result: Process exited with code ${verifyForgery.status} (FORGERY DETECTED)${RESET}`);

    await delay(700);

    // -------------------------------------------------------------------------
    // STEP 5: Legitimate Remediation & Clean Unlock
    // -------------------------------------------------------------------------
    banner(5, 'Legitimate Implementation Fix & Verification Passed');
    subtext('Human or honest agent restores all 11 adversarial tests and fixes src/...');

    // Restore pristine 11 tests and re-lock
    chmodSync(testFilePath, 0o644);
    writeFileSync(testFilePath, ORIGINAL_11_TESTS, 'utf8');
    spawnSync(process.execPath, [TAMPER_GUARD, 'lock', testFileName, '--force'], {
      cwd: tempDir,
      stdio: 'inherit'
    });

    await delay(500);
    console.log(`\n${CYAN}Running verification command against implementation:${RESET}`);
    const verifyPass = spawnSync(process.execPath, [TAMPER_GUARD, 'verify', testFileName, '--cmd', 'node -e "process.exit(0)"'], {
      cwd: tempDir,
      stdio: 'inherit'
    });

    if (verifyPass.status === 0) {
      console.log(`\n${GREEN}${BOLD}>> Result: Process exited with code 0 (VERIFICATION PASSED)${RESET}`);
    }

    await delay(500);
    console.log(`\n${CYAN}Releasing adversarial lock for git commit:${RESET}`);
    spawnSync(process.execPath, [TAMPER_GUARD, 'unlock', testFileName], {
      cwd: tempDir,
      stdio: 'inherit'
    });

    console.log(`\n${GREEN}${BOLD}🎉 DEMO COMPLETE: Cheating prevented, integrity preserved!${RESET}\n`);

  } finally {
    // Clean up temporary workspace
    try {
      chmodSync(testFilePath, 0o644);
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runDemo().catch(err => {
  console.error('Demo simulation error:', err);
  process.exit(1);
});
