/**
 * Challenge 05: Security & Redaction Implementation
 * Buggy: Misses multiline PEM keys, misses quoted tokens with symbols, and allows shell command injection.
 */

import { execSync } from 'node:child_process';

export function sanitizeLog(text: string): string {
  // Bug 1: Only matches single-line alphanumeric tokens; misses multiline PEM blocks and symbols
  return text
    .replace(/API_KEY=[a-zA-Z0-9]+/g, 'API_KEY=[REDACTED]')
    .replace(/Bearer\s+[a-zA-Z0-9]+/g, 'Bearer [REDACTED]');
}

export function executeEcho(userInput: string): string {
  // Bug 2: Unsafe string interpolation evaluated by shell allows command injection
  return execSync(`echo "${userInput}"`, { shell: true }).toString();
}
