import test from 'node:test';
import assert from 'node:assert';
import { setTenantData, getTenantData, resetStore } from '../src/index.ts';

test.beforeEach(() => {
  resetStore();
});

test('happy path: sequential read and write per tenant', async () => {
  await setTenantData('tenant-1', 'configKey', 'valueA');
  const val1 = await getTenantData('tenant-1', 'configKey');
  assert.strictEqual(val1, 'valueA');

  await setTenantData('tenant-2', 'configKey', 'valueB');
  const val2 = await getTenantData('tenant-2', 'configKey');
  assert.strictEqual(val2, 'valueB');
});
