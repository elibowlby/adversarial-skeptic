import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleWebhook,
  createBillingDb,
  isFixEnabled
} from '../src/billing/webhook-handler.ts';

const test1Name = isFixEnabled()
  ? 'idempotency key replay deduplicated cleanly'
  : 'idempotency key replay allows duplicate charge';

const test2Name = isFixEnabled()
  ? '0-byte payload returns 400 bad request without crash'
  : '0-byte payload crashes JSON parser with unexpected EOF';

test(test1Name, async () => {
  const db = createBillingDb();
  const payload = JSON.stringify({
    event: 'charge.created',
    amount: 4900,
    currency: 'usd',
    customer: 'cus_99482'
  });
  const headers = { 'idempotency-key': 'idem_stripe_evt_84920' };

  // Concurrent replay simulation: two simultaneous deliveries of identical event
  const [res1, res2] = await Promise.all([
    handleWebhook(payload, headers, db),
    handleWebhook(payload, headers, db)
  ]);

  const charges = db.getCharges();
  assert.strictEqual(
    charges.length,
    1,
    `Expected exactly 1 charge recorded, but duplicate charges occurred (got ${charges.length})`
  );
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res2.statusCode, 200);
});

test(test2Name, async () => {
  const db = createBillingDb();
  const res = await handleWebhook('', { 'content-type': 'application/json' }, db);
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.error ?? '', /empty/i);
});
