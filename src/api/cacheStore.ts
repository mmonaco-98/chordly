// Tiny in-memory + localStorage cache with pub/sub.
// Each key is read/written as JSON in localStorage so cached data
// survives reloads and works offline.

type Listener = () => void;

const memory = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
const STORAGE_PREFIX = "cache:";

function load<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as T;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

export function getCache<T>(key: string): T | undefined {
  return load<T>(key);
}

export function setCache<T>(key: string, value: T): void {
  memory.set(key, value);
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage full / disabled — keep in-memory copy
  }
  const ls = listeners.get(key);
  if (ls) ls.forEach((l) => l());
}

export function clearCache(key?: string): void {
  if (key) {
    memory.delete(key);
    localStorage.removeItem(STORAGE_PREFIX + key);
    const ls = listeners.get(key);
    if (ls) ls.forEach((l) => l());
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  memory.clear();
  listeners.forEach((ls) => ls.forEach((l) => l()));
}

export function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
  };
}

// Stable fallbacks per chiave — evita new [] ad ogni getSnapshot call
const fallbacks = new Map<string, unknown>();

export function getSnapshot<T>(key: string, fallback: T): T {
  const value = load<T>(key); // ← carica da memory O da localStorage
  if (value !== undefined) return value;
  //if (memory.has(key)) return memory.get(key) as T;
  // Riusa sempre lo stesso riferimento fallback per questa chiave
  if (!fallbacks.has(key)) fallbacks.set(key, fallback);
  return fallbacks.get(key) as T;
}
