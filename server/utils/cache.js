// Small TTL cache used by the read-heavy GET routes.
//
// Entries expire after `ttlMs` and the map is capped at `maxEntries` so a long
// running process cannot grow unbounded. Note that on serverless deployments
// each function instance keeps its own copy, so this is a latency optimisation
// for warm instances, never a source of truth.
class TTLCache {
  constructor(ttlMs, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp >= this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    // Refresh insertion order so the hottest keys survive eviction
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Map preserves insertion order, so the first key is the least recently used
      this.store.delete(this.store.keys().next().value);
    }
    this.store.set(key, { value, timestamp: Date.now() });
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = { TTLCache };
