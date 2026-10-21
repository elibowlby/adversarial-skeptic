import test from 'node:test';
import assert from 'node:assert';
import { normalizeTimestamp, parseBatch } from '../src/index.ts';

test('happy path: normalizes standard UTC ISO timestamps', () => {
  const result = normalizeTimestamp('2026-10-15T12:00:00Z');
  assert.strictEqual(result, '2026-10-15T12:00:00.000Z');
});

test('happy path: parses standard Unix LF batch', () => {
  const batch = '2026-10-15T12:00:00Z\n2026-10-16T08:00:00Z\n';
  const result = parseBatch(batch);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0], '2026-10-15T12:00:00.000Z');
  assert.strictEqual(result[1], '2026-10-16T08:00:00.000Z');
});
