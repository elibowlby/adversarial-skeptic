import test from 'node:test';
import assert from 'node:assert';
import { parseNDJSON, streamDecode } from '../src/index.ts';

test('vector-1: 0-byte input returns empty array without throwing uncaught exception', () => {
  const result = parseNDJSON('');
  assert.deepStrictEqual(result, []);
});

test('vector-1: literal "null" and blank lines are skipped without throwing TypeError', () => {
  const input = '{"id": 1, "name": "first"}\nnull\n\n{"id": 2, "name": "second"}';
  const result = parseNDJSON(input);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].name, 'first');
  assert.strictEqual(result[1].name, 'second');
});

test('vector-1: mid-stream truncated 4-byte UTF-8 emoji split across chunks is preserved', () => {
  const emoji = Buffer.from('🚀');
  assert.strictEqual(emoji.length, 4);
  const chunk1 = emoji.subarray(0, 2);
  const chunk2 = emoji.subarray(2);

  const decoded = streamDecode([chunk1, chunk2]);
  assert.strictEqual(decoded, '🚀');
});
