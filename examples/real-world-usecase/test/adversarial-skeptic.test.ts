import test from 'node:test';
import assert from 'node:assert';
import { parseStream, decodeChunks } from '../src/stream-reader.ts';

test('0-byte empty input returns empty batch without throwing', () => {
  const result = parseStream('');
  assert.deepStrictEqual(result, []);
});

test('literal "null" and blank lines are skipped cleanly', () => {
  const payload = '{"id": 1, "type": "init"}\nnull\n\n{"id": 2, "type": "step"}';
  const result = parseStream(payload);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].type, 'init');
  assert.strictEqual(result[1].type, 'step');
});

test('multi-byte UTF-8 emoji split across chunk boundaries is preserved', () => {
  const emoji = Buffer.from('🚀');
  const chunk1 = emoji.subarray(0, 2);
  const chunk2 = emoji.subarray(2);

  const decoded = decodeChunks([chunk1, chunk2]);
  assert.strictEqual(decoded, '🚀');
});
