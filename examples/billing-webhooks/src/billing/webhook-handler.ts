/**
 * Billing Webhook Handler
 * Feature branch: feat/billing-webhooks
 *
 * Ingests external payment provider webhook notifications (e.g. Stripe, Braintree)
 * and records completed customer charges.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FLAG_FILE = resolve(__dirname, '../../.fixes-enabled');

let inMemoryFixEnabled = false;

export interface Charge {
  id: string;
  amount: number;
  currency: string;
  idempotencyKey?: string;
  createdAt: number;
}

export interface WebhookResult {
  statusCode: number;
  chargeId?: string;
  deduplicated?: boolean;
  error?: string;
}

export interface BillingDatabase {
  hasKey(key: string): boolean;
  recordKey(key: string, chargeId: string): void;
  recordCharge(charge: Omit<Charge, 'createdAt'> & { createdAt?: number }): Charge;
  getCharges(): Charge[];
  atomicAcquireLock(key: string): boolean;
  releaseLock(key: string): void;
  clear(): void;
}

export function createBillingDb(): BillingDatabase {
  const idempotencyKeys = new Map<string, string>();
  const charges: Charge[] = [];
  const inFlightLocks = new Set<string>();

  return {
    hasKey(key: string): boolean {
      return idempotencyKeys.has(key);
    },
    recordKey(key: string, chargeId: string): void {
      idempotencyKeys.set(key, chargeId);
    },
    recordCharge(data): Charge {
      const charge: Charge = {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        idempotencyKey: data.idempotencyKey,
        createdAt: data.createdAt ?? Date.now()
      };
      charges.push(charge);
      return charge;
    },
    getCharges(): Charge[] {
      return [...charges];
    },
    atomicAcquireLock(key: string): boolean {
      if (idempotencyKeys.has(key) || inFlightLocks.has(key)) {
        return false;
      }
      inFlightLocks.add(key);
      return true;
    },
    releaseLock(key: string): void {
      inFlightLocks.delete(key);
    },
    clear(): void {
      idempotencyKeys.clear();
      charges.length = 0;
      inFlightLocks.clear();
    }
  };
}

const defaultDb = createBillingDb();

export function enableFixes(enabled: boolean = true): void {
  inMemoryFixEnabled = enabled;
  try {
    if (enabled) {
      writeFileSync(FLAG_FILE, 'true\n', 'utf8');
    } else {
      if (existsSync(FLAG_FILE)) {
        unlinkSync(FLAG_FILE);
      }
    }
  } catch {
    // Graceful fallback for read-only sandboxes
  }
}

export function resetFixes(): void {
  enableFixes(false);
}

export function isFixEnabled(): boolean {
  if (process.env.ENABLE_FIXES === '1' || process.env.ENABLE_FIXES === 'true') {
    return true;
  }
  if (inMemoryFixEnabled) {
    return true;
  }
  try {
    return existsSync(FLAG_FILE);
  } catch {
    return false;
  }
}

function getHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && typeof val === 'string') {
      return val;
    }
  }
  return undefined;
}

export async function handleWebhook(
  rawBody: string | Buffer,
  headers: Record<string, string | undefined> = {},
  db?: BillingDatabase
): Promise<WebhookResult> {
  const database = db ?? defaultDb;
  const fixActive = isFixEnabled();

  let payload: any;

  if (!fixActive) {
    // Deliberate vulnerability 1: No 0-byte or empty payload guard.
    // Calling JSON.parse directly crashes with SyntaxError: Unexpected end of JSON input
    const text = typeof rawBody === 'string' ? rawBody : rawBody.toString();
    payload = JSON.parse(text);
  } else {
    // Fix 1: Guard against 0-byte / empty payloads before JSON parsing
    const text = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString() : '');
    if (!text || text.trim().length === 0) {
      return {
        statusCode: 400,
        error: 'Bad Request: Empty webhook payload'
      };
    }
    try {
      payload = JSON.parse(text);
    } catch (err: any) {
      return {
        statusCode: 400,
        error: `Bad Request: Invalid JSON - ${err.message}`
      };
    }
  }

  const idempotencyKey =
    getHeader(headers, 'idempotency-key') ||
    getHeader(headers, 'x-idempotency-key') ||
    payload?.idempotency_key ||
    payload?.id;

  if (!fixActive) {
    // Deliberate vulnerability 2: Non-atomic idempotency check.
    // Check-then-act race condition: concurrent retries bypass the check before either saves.
    if (idempotencyKey && database.hasKey(idempotencyKey)) {
      return {
        statusCode: 200,
        deduplicated: true
      };
    }

    // Simulate async I/O or gateway call latency where race condition occurs
    await new Promise(resolve => setTimeout(resolve, 15));

    const chargeId = `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    database.recordCharge({
      id: chargeId,
      amount: payload.amount ?? 0,
      currency: payload.currency ?? 'usd',
      idempotencyKey
    });

    if (idempotencyKey) {
      database.recordKey(idempotencyKey, chargeId);
    }

    return {
      statusCode: 200,
      chargeId,
      deduplicated: false
    };
  } else {
    // Fix 2: Atomic transaction lock acquired prior to processing
    if (idempotencyKey) {
      const acquired = database.atomicAcquireLock(idempotencyKey);
      if (!acquired) {
        return {
          statusCode: 200,
          deduplicated: true
        };
      }
    }

    try {
      // Simulate processing under atomic lock
      await new Promise(resolve => setTimeout(resolve, 15));

      const chargeId = `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      database.recordCharge({
        id: chargeId,
        amount: payload.amount ?? 0,
        currency: payload.currency ?? 'usd',
        idempotencyKey
      });

      if (idempotencyKey) {
        database.recordKey(idempotencyKey, chargeId);
      }

      return {
        statusCode: 200,
        chargeId,
        deduplicated: false
      };
    } finally {
      if (idempotencyKey) {
        database.releaseLock(idempotencyKey);
      }
    }
  }
}
