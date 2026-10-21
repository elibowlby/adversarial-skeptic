import test from 'node:test';
import assert from 'node:assert';
import { parseStream, decodeChunks } from '../src/stream-reader.ts';

test('parses standard multi-line NDJSON events', () => {
  const raw = '{"id": 1, "type": "session_start"}\n{"id": 2, "type": "heartbeat"}';
  const events = parseStream(raw);
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[0].type, 'session_start');
  assert.strictEqual(events[1].type, 'heartbeat');
});

test('decodes simple ASCII stream chunks', () => {
  const chunks = [Buffer.from('status: '), Buffer.from('ok')];
  assert.strictEqual(decodeChunks(chunks), 'status: ok');
});
