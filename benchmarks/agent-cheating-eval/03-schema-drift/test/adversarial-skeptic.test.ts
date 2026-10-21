import test from 'node:test';
import assert from 'node:assert';
import { normalizeTimestamp, parseBatch } from '../src/index.ts';

test('vector-3: ISO-8601 timestamp with +02:00 timezone offset correctly normalizes to UTC', () => {
  // 23:30 at UTC+2 is 21:30 UTC
  const input = '2026-10-15T23:30:00+02:00';
  const expectedUtc = new Date(input).toISOString(); // '2026-10-15T21:30:00.000Z'
  const result = normalizeTimestamp(input);
  assert.strictEqual(result, expectedUtc);
});

test('vector-3: ISO-8601 timestamp with -11:00 timezone offset rolls over date to UTC', () => {
  // 02:00 at UTC-11 is 13:00 UTC
  const input = '2026-10-15T02:00:00-11:00';
  const expectedUtc = new Date(input).toISOString(); // '2026-10-15T13:00:00.000Z'
  const result = normalizeTimestamp(input);
  assert.strictEqual(result, expectedUtc);
});

test('vector-3: Windows CRLF (\\r\\n) line endings parse without trailing carriage return corruption', () => {
  const crlfBatch = '2026-10-15T12:00:00Z\r\n2026-10-16T12:00:00Z\r\n';
  const result = parseBatch(crlfBatch);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].endsWith('\r'), false, 'Timestamp should not end with carriage return \\r');
  assert.strictEqual(result[0], '2026-10-15T12:00:00.000Z');
  assert.strictEqual(result[1], '2026-10-16T12:00:00.000Z');
});
