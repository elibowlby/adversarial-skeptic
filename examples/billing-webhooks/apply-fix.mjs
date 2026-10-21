import { enableFixes } from './src/billing/webhook-handler.ts';

enableFixes(true);
console.log('Applied bugfix: enabled atomic idempotency lock and empty payload guard in src/billing/webhook-handler.ts');
