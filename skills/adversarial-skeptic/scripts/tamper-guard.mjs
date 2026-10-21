#!/usr/bin/env node

/**
 * tamper-guard.mjs
 * 
 * Cryptographic No-Cheating Lock & Verification for Adversarial Testing.
 * Zero external dependencies (uses Node.js built-ins).
 * 
 * Commands:
 *   lock <test-file-path> [--force]
 *     Computes SHA-256 hash, verifies active test assertions (>=1, no skipped/todo tests),
 *     writes .adversarial-lock.json and an out-of-workspace shadow lock in os.tmpdir(),
 *     and marks files read-only (0o444).
 * 
 *   verify <test-file-path> [--cmd "<test-command>"]
 *     Cross-checks .adversarial-lock.json against the shadow lock in os.tmpdir().
 *     Recomputes SHA-256 hash and verifies against lock records.
 *     If tampered or forged, exits with code 1.
 *     If intact and --cmd is provided, executes the test suite command and exits with its status.
 * 
 *   unlock <test-file-path>
 *     Restores write permissions (0o644) and removes .adversarial-lock.json and the shadow lock.
 */

import { readFileSync, writeFileSync, existsSync, chmodSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const LOCK_FILE = '.adversarial-lock.json';

// Patterns to detect test blocks across supported test runners
const TEST_PATTERNS = [
  /\b(?:it|test)\s*\(/g,              // JS/TS: it('...', () => {}), test('...', () => {})
  /^\s*def\s+test_\w+\s*\(/gm,        // Python: def test_something():
  /#\[\s*test\s*\]/g,                 // Rust: #[test]
  /^\s*func\s+Test[A-Z]\w*\s*\(/gm    // Go: func TestSomething(t *testing.T)
];

// Markers indicating weakened or bypassed tests
const SKIP_PATTERNS = [
  /\bit\.skip\b/,
  /\btest\.skip\b/,
  /\bdescribe\.skip\b/,
  /\btest\.todo\b/,
  /\bxdescribe\s*\(/,
  /\bxit\s*\(/,
  /\bxtest\s*\(/,
  /@pytest\.mark\.skip\b/,
  /@pytest\.mark\.skipif\b/,
  /#\[\s*ignore\s*\]/
];

function calculateHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function getShadowLockPath(resolvedPath) {
  const hash = createHash('sha256').update(resolvedPath).digest('hex');
  return resolve(os.tmpdir(), `.adversarial-shadow-${hash}.json`);
}

function countTests(content) {
  let count = 0;
  for (const pattern of TEST_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function detectSkippedTests(content) {
  const found = [];
  for (const pattern of SKIP_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }
  return found;
}

function printUsageAndExit(code = 1) {
  console.log(`
Usage:
  node tamper-guard.mjs lock <test-file-path> [--force]
  node tamper-guard.mjs verify <test-file-path> [--cmd "<test-command>"]
  node tamper-guard.mjs unlock <test-file-path>

Commands:
  lock <file>      Calculates SHA-256 and test count, writes read-only .adversarial-lock.json and shadow lock
  verify <file>    Cross-checks lockfile against shadow lock and verifies test file integrity. Optionally runs --cmd
  unlock <file>    Restores write permissions (0o644) and removes lockfiles

Examples:
  node tamper-guard.mjs lock test/adversarial-skeptic.test.ts
  node tamper-guard.mjs verify test/adversarial-skeptic.test.ts --cmd "vitest run test/adversarial-skeptic.test.ts"
  node tamper-guard.mjs unlock test/adversarial-skeptic.test.ts
`);
  process.exit(code);
}

function runLock(targetPath, force = false) {
  const absPath = resolve(process.cwd(), targetPath);
  if (!existsSync(absPath)) {
    console.error(`ERROR: Test file not found: ${targetPath} (resolved: ${absPath})`);
    process.exit(1);
  }

  const lockFilePath = resolve(process.cwd(), LOCK_FILE);
  const shadowPath = getShadowLockPath(absPath);
  const lockExists = existsSync(lockFilePath);
  const shadowExists = existsSync(shadowPath);

  if ((lockExists || shadowExists) && !force) {
    console.error(`LOCK REJECTED: Lockfile or shadow lock already exists for this test file.`);
    console.error(`To re-lock, run 'unlock <file>' first or pass '--force'.`);
    process.exit(1);
  }

  const content = readFileSync(absPath, 'utf8');
  const testCount = countTests(content);
  const skippedMarkers = detectSkippedTests(content);

  if (skippedMarkers.length > 0) {
    console.error(`LOCK REJECTED: Adversarial test suite contains skipped or deferred tests (${skippedMarkers.join(', ')})!`);
    console.error(`All adversarial test assertions must be active and enabled.`);
    process.exit(1);
  }

  if (testCount === 0) {
    console.error(`LOCK REJECTED: Adversarial test suite contains 0 detectable test cases!`);
    console.error(`Supported test patterns: it(), test(), def test_*(), #[test], func Test*()`);
    process.exit(1);
  }

  const sha256 = calculateHash(content);
  const lockData = {
    version: '1.0.0',
    lockedAt: new Date().toISOString(),
    targetFile: targetPath,
    targetFileResolved: absPath,
    sha256,
    testCount
  };

  // If force is passed, restore write permissions on existing lock files before overwriting
  if (lockExists) {
    try { chmodSync(lockFilePath, 0o644); } catch {}
  }
  if (shadowExists) {
    try { chmodSync(shadowPath, 0o644); } catch {}
  }

  const payload = JSON.stringify(lockData, null, 2) + '\n';
  writeFileSync(lockFilePath, payload, 'utf8');
  writeFileSync(shadowPath, payload, 'utf8');

  // Protect test file and lockfiles with read-only permissions
  try { chmodSync(absPath, 0o444); } catch {}
  try { chmodSync(lockFilePath, 0o444); } catch {}
  try { chmodSync(shadowPath, 0o444); } catch {}

  console.log(`Locked ${targetPath} (${testCount} tests, sha256: ${sha256}). Read-only mode set.`);
}

function runVerify(targetPath, testCmd) {
  const absPath = resolve(process.cwd(), targetPath);
  const lockFilePath = resolve(process.cwd(), LOCK_FILE);
  const shadowPath = getShadowLockPath(absPath);

  const lockExists = existsSync(lockFilePath);
  const shadowExists = existsSync(shadowPath);

  if (!lockExists && !shadowExists) {
    console.error(`ERROR: No ${LOCK_FILE} found. Run 'lock <test-file>' first.`);
    process.exit(1);
  }

  if (!lockExists || !shadowExists) {
    console.error(`FORGERY DETECTED: ${LOCK_FILE} does not match shadow lock.`);
    process.exit(1);
  }

  let lockRaw, shadowRaw, lockData, shadowData;
  try {
    lockRaw = readFileSync(lockFilePath, 'utf8');
    shadowRaw = readFileSync(shadowPath, 'utf8');
    lockData = JSON.parse(lockRaw);
    shadowData = JSON.parse(shadowRaw);
  } catch (err) {
    console.error(`FORGERY DETECTED: ${LOCK_FILE} does not match shadow lock.`);
    process.exit(1);
  }

  // Cross-check lockfile against shadow lock
  const lockHash = calculateHash(lockRaw.trim());
  const shadowHash = calculateHash(shadowRaw.trim());
  if (
    lockHash !== shadowHash ||
    lockData.sha256 !== shadowData.sha256 ||
    lockData.lockedAt !== shadowData.lockedAt ||
    lockData.testCount !== shadowData.testCount ||
    lockData.targetFileResolved !== shadowData.targetFileResolved
  ) {
    console.error(`FORGERY DETECTED: ${LOCK_FILE} does not match shadow lock.`);
    process.exit(1);
  }

  if (!existsSync(absPath)) {
    console.error(`TAMPER DETECTED: Test file was deleted or moved: ${targetPath}`);
    console.error(`Restore ${targetPath} immediately.`);
    process.exit(1);
  }

  // Verify target file path matches lockfile (normalizing both paths)
  if (resolve(process.cwd(), lockData.targetFile) !== absPath && lockData.targetFileResolved !== absPath) {
    console.error(`LOCK MISMATCH: Provided test file (${targetPath}) does not match locked file (${lockData.targetFile}).`);
    process.exit(1);
  }

  const content = readFileSync(absPath, 'utf8');
  const currentHash = calculateHash(content);
  const currentCount = countTests(content);
  const skippedMarkers = detectSkippedTests(content);

  // Check for any tampering
  const hashMismatch = currentHash !== lockData.sha256;
  const countReduced = currentCount < lockData.testCount;
  const hasSkipped = skippedMarkers.length > 0;

  if (hashMismatch || countReduced || hasSkipped) {
    console.error(`TAMPER DETECTED: ${targetPath} was modified after locking.`);
    if (hashMismatch) {
      console.error(`  Expected SHA-256: ${lockData.sha256}`);
      console.error(`  Current SHA-256:  ${currentHash}`);
    }
    if (countReduced) {
      console.error(`  Expected tests:   ${lockData.testCount}`);
      console.error(`  Current tests:    ${currentCount}`);
    }
    if (hasSkipped) {
      console.error(`  Skipped markers found: ${skippedMarkers.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${targetPath} (${currentCount} tests, sha256 match).`);

  if (testCmd) {
    console.log(`Running: ${testCmd}`);
    const result = spawnSync(testCmd, {
      shell: true,
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      console.error(`Verification failed: exit code ${result.status ?? 1}`);
      process.exit(result.status ?? 1);
    }

    console.log(`Verification passed: all tests passed without test tampering.`);
  }
}

function runUnlock(targetPath) {
  const absPath = resolve(process.cwd(), targetPath);
  const lockFilePath = resolve(process.cwd(), LOCK_FILE);
  const shadowPath = getShadowLockPath(absPath);

  if (existsSync(absPath)) {
    try { chmodSync(absPath, 0o644); } catch {}
  }
  if (existsSync(lockFilePath)) {
    try { chmodSync(lockFilePath, 0o644); } catch {}
    try { unlinkSync(lockFilePath); } catch {}
  }
  if (existsSync(shadowPath)) {
    try { chmodSync(shadowPath, 0o644); } catch {}
    try { unlinkSync(shadowPath); } catch {}
  }

  console.log(`Unlocked ${targetPath}. Lockfiles removed.`);
}

// CLI Parsing
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsageAndExit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const command = args[0];
const targetFile = args[1];

if (!targetFile) {
  console.error(`ERROR: Missing target test file path.`);
  printUsageAndExit(1);
}

if (command === 'lock') {
  const force = args.includes('--force');
  runLock(targetFile, force);
} else if (command === 'verify') {
  let cmd = null;
  const cmdIdx = args.indexOf('--cmd');
  if (cmdIdx !== -1 && args[cmdIdx + 1]) {
    cmd = args[cmdIdx + 1];
  }
  runVerify(targetFile, cmd);
} else if (command === 'unlock') {
  runUnlock(targetFile);
} else {
  console.error(`ERROR: Unknown command '${command}'. Use 'lock', 'verify', or 'unlock'.`);
  printUsageAndExit(1);
}
