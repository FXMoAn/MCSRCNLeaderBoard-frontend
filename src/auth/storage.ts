import type { SmallStorage } from './flow';

export function createSessionStorage(backing?: SmallStorage): SmallStorage {
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      try {
        if (backing) return backing.getItem(key);
      } catch {
        /* Use the SDK's in-memory fallback. */
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        backing?.setItem(key, value);
      } catch {
        /* Keep this session in memory. */
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        backing?.removeItem(key);
      } catch {
        /* The in-memory copy is already gone. */
      }
    },
  };
}

export function discardMissingSession(storage: SmallStorage, key: string) {
  for (const suffix of ['', '-code-verifier', '-user']) storage.removeItem(key + suffix);
}
