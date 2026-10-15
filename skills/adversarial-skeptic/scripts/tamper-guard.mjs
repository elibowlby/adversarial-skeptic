#!/usr/bin/env node

/**
 * tamper-guard.mjs
 * 
 * Cryptographic No-Cheating Lock & Verification for Adversarial Testing.
 * Zero external dependencies (uses Node.js built-ins).
 * 
 * Commands:
 *   lock <test-file-path>
 *     Computes SHA-256 hash, verifies active test assertions (>=1, no skipped/todo tests),
 *     and writes .adversarial-lock.json.
 * 
 *   verify <test-file-path> [--cmd "<test-command>"]
 *     Recomputes SHA-256 hash and verifies against .adversarial-lock.json.
 *     If tampered, exits with code 1.
 *     If intact and --cmd is provided, executes the test suite command and exits with its status.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

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
  node tamper-guard.mjs lock <test-file-path>
  node tamper-guard.mjs verify <test-file-path> [--cmd "<test-command>"]

Commands:
  lock <file>      Calculates SHA-256 and test count, writes .adversarial-lock.json
  verify <file>    Verifies SHA-256 match. Optionally runs --cmd if hash matches.

Examples:
  node tamper-guard.mjs lock test/adversarial-skeptic.test.ts
  node tamper-guard.mjs verify test/adversarial-skeptic.test.ts --cmd "vitest run test/adversarial-skeptic.test.ts"
`);
  process.exit(code);
}

function runLock(targetPath) {
  const absPath = resolve(process.cwd(), targetPath);
  if (!existsSync(absPath)) {
    console.error(`ERROR: Test file not found: ${targetPath} (resolved: ${absPath})`);
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

  const lockFilePath = resolve(process.cwd(), LOCK_FILE);
  writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2) + '\n', 'utf8');

  console.log(`🔒 Adversarial lock engaged:`);
  console.log(`  File:        ${targetPath}`);
  console.log(`  Resolved:    ${absPath}`);
  console.log(`  SHA-256:     ${sha256}`);
  console.log(`  Active Tests: ${testCount}`);
  console.log(`  Lockfile:    ${LOCK_FILE}`);
  console.log(`\nBuilder agent is now locked to fixing implementation code without touching this test suite.`);
}

function runVerify(targetPath, testCmd) {
  const lockFilePath = resolve(process.cwd(), LOCK_FILE);
  if (!existsSync(lockFilePath)) {
    console.error(`ERROR: No ${LOCK_FILE} found. Run 'lock <test-file>' first.`);
    process.exit(1);
  }

  let lockData;
  try {
    lockData = JSON.parse(readFileSync(lockFilePath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: Failed to parse ${LOCK_FILE}: ${err.message}`);
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), targetPath);
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
    console.error(`TAMPER DETECTED: Builder agent modified the adversarial test suite! Restore ${targetPath} immediately.`);
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

  console.log(`🛡️ Test suite verified intact:`);
  console.log(`  File:        ${targetPath}`);
  console.log(`  SHA-256:     ${currentHash} (MATCH)`);
  console.log(`  Active Tests: ${currentCount} (MATCH)`);

  if (testCmd) {
    console.log(`\nExecuting verification command: ${testCmd}`);
    console.log(`----------------------------------------------------------------`);
    const result = spawnSync(testCmd, {
      shell: true,
      stdio: 'inherit'
    });
    console.log(`----------------------------------------------------------------`);

    if (result.status !== 0) {
      console.error(`❌ VERIFICATION FAILED: Test suite exited with code ${result.status ?? 1}. Implementation still contains bugs.`);
      process.exit(result.status ?? 1);
    }

    console.log(`✅ VERIFICATION PASSED: All adversarial tests passed without test tampering.`);
  }
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
  runLock(targetFile);
} else if (command === 'verify') {
  let cmd = null;
  const cmdIdx = args.indexOf('--cmd');
  if (cmdIdx !== -1 && args[cmdIdx + 1]) {
    cmd = args[cmdIdx + 1];
  }
  runVerify(targetFile, cmd);
} else {
  console.error(`ERROR: Unknown command '${command}'. Use 'lock' or 'verify'.`);
  printUsageAndExit(1);
}
