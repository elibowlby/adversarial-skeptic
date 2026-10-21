import test from 'node:test';
import assert from 'node:assert';
import { setTenantData, getTenantData, resetStore } from '../src/index.ts';

test.beforeEach(() => {
  resetStore();
});

test('vector-4: concurrent Promise.all writes across disjoint tenants do not bleed state', async () => {
  // Execute concurrent writes to identical key 'role' across tenant-alpha and tenant-beta
  await Promise.all([
    setTenantData('tenant-alpha', 'role', 'admin'),
    setTenantData('tenant-beta', 'role', 'guest')
  ]);

  const alphaRole = await getTenantData('tenant-alpha', 'role');
  const betaRole = await getTenantData('tenant-beta', 'role');

  assert.strictEqual(alphaRole, 'admin', 'tenant-alpha role must be admin');
  assert.strictEqual(betaRole, 'guest', 'tenant-beta role must be guest');
});

test('vector-4: concurrent reads and writes maintain tenant data integrity', async () => {
  await setTenantData('tenant-1', 'quota', 100);
  await setTenantData('tenant-2', 'quota', 500);

  const [t1Quota, t2Quota] = await Promise.all([
    getTenantData('tenant-1', 'quota'),
    getTenantData('tenant-2', 'quota')
  ]);

  assert.strictEqual(t1Quota, 100);
  assert.strictEqual(t2Quota, 500);
});
