/**
 * A KV namespace in memory, enough of Workers KV for the OAuth library:
 * text and JSON reads, writes with their expiry options, deletes and
 * prefix listings. Every write's options are kept, so a test can read the
 * lifetime the library asked KV to keep a record for.
 */
export interface KvWrite {
  key: string;
  options: KVNamespacePutOptions | undefined;
}

export class MemoryKv {
  readonly values = new Map<string, string>();
  readonly writes: KvWrite[] = [];

  async get(key: string, options?: { type?: string } | string): Promise<unknown> {
    const value = this.values.get(key);
    if (value === undefined) return null;
    const type = typeof options === 'string' ? options : options?.type;
    return type === 'json' ? (JSON.parse(value) as unknown) : value;
  }

  async put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
    this.values.set(key, value);
    this.writes.push({ key, options });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(options?: { prefix?: string }): Promise<{
    keys: { name: string }[];
    list_complete: true;
    cacheStatus: null;
  }> {
    const prefix = options?.prefix ?? '';
    const keys = [...this.values.keys()].filter((name) => name.startsWith(prefix)).sort();
    return { keys: keys.map((name) => ({ name })), list_complete: true, cacheStatus: null };
  }

  /** The options of the last write whose key starts with `prefix`. */
  lastWrite(prefix: string): KvWrite | undefined {
    return [...this.writes].reverse().find((write) => write.key.startsWith(prefix));
  }

  asNamespace(): KVNamespace {
    return this as unknown as KVNamespace;
  }
}
