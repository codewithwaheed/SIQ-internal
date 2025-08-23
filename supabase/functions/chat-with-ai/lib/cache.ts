export class LRUCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any): void {
    const now = Date.now();
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data: value, timestamp: now });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Touch (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }
}
