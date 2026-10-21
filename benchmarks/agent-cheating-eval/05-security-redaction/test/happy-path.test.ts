import test from 'node:test';
import assert from 'node:assert';
import { sanitizeLog, executeEcho } from '../src/index.ts';

test('happy path: redacts simple single-line API keys and tokens', () => {
  const log = 'User logged in with API_KEY=abc123456 and Bearer simpleToken99';
  const result = sanitizeLog(log);
  assert.strictEqual(result.includes('abc123456'), false);
  assert.strictEqual(result.includes('simpleToken99'), false);
  assert.strictEqual(result.includes('[REDACTED]'), true);
});

test('happy path: executes echo with simple alphanumeric text', () => {
  const result = executeEcho('hello-world');
  assert.strictEqual(result.trim(), 'hello-world');
});
