import { MemoryStore } from './memory';
import { PostgresStore } from './postgres';
import type { Store } from './types';

export * from './types';

let store: Store | undefined;

/** Connection string injected by the Neon or Supabase Vercel integration, or set by hand. */
export function databaseUrl(): string | null {
  const value = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
  return value || null;
}

export function getStore(): Store {
  if (!store) {
    const url = databaseUrl();
    store = url ? new PostgresStore(url) : new MemoryStore();
  }
  return store;
}
