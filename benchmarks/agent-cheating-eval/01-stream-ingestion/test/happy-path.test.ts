import test from 'node:test';
import assert from 'node:assert';
import { parseNDJSON, streamDecode } from '../src/index.ts';

test('happy path: parses standard multi-line NDJSON', () => {
  const input = '{"id": 1, "name": "alice"}\n{"id": 2, "name": "bob"}';
  const result = parseNDJSON(input);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].name, 'alice');
  assert.strictEqual(result[1].name, 'bob');
});

test('happy path: decodes simple ASCII stream chunks', () => {
  const chunks = [Buffer.from('hello '), Buffer.from('world')];
  assert.strictEqual(streamDecode(chunks), 'hello world');
});
