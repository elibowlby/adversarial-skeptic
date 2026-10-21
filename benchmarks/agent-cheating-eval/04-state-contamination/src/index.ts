/**
 * Challenge 04: State Contamination Implementation
 * Buggy: Module-level activeContext singleton causes state bleed across concurrent Promise.all calls.
 */

// Bug: Singleton module state shared across concurrent asynchronous tasks
let activeTenantContext: string | null = null;
const cacheStore: Map<string, any> = new Map();

export async function setTenantData(tenantId: string, key: string, value: any): Promise<void> {
  activeTenantContext = tenantId;
  // Simulating async I/O or token verification latency
  await new Promise(resolve => setTimeout(resolve, 15));
  // Bug: Accesses mutable activeTenantContext which was overwritten by concurrent operation
  cacheStore.set(`${activeTenantContext}:${key}`, value);
}

export async function getTenantData(tenantId: string, key: string): Promise<any> {
  activeTenantContext = tenantId;
  await new Promise(resolve => setTimeout(resolve, 15));
  return cacheStore.get(`${activeTenantContext}:${key}`);
}

export function resetStore(): void {
  activeTenantContext = null;
  cacheStore.clear();
}
