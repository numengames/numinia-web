/**
 * Enough of a Durable Object's state for the bodies' tests in Node: the
 * key-value storage (values cloned in and out, as workerd's are), one
 * alarm on the test's clock that rings the object's `alarm()`, and a
 * namespace that hands out one object per name, as `getByName` does.
 * RPC through a stub is a plain method call here.
 */
export class MemoryStorage {
  readonly values = new Map<string, unknown>();
  alarmAt: number | null = null;
  /** What the alarm rings: the object's `alarm()`. */
  ring: (() => Promise<void>) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.values.get(key);
    return value === undefined ? undefined : (structuredClone(value) as T);
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<boolean> {
    return this.values.delete(key);
  }

  async list<T>(options: { prefix?: string } = {}): Promise<Map<string, T>> {
    const prefix = options.prefix ?? '';
    const keys = [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
    return new Map(keys.map((key) => [key, structuredClone(this.values.get(key)) as T]));
  }

  async getAlarm(): Promise<number | null> {
    return this.alarmAt;
  }

  async setAlarm(when: number | Date): Promise<void> {
    this.stop();
    const at = Number(when);
    this.alarmAt = at;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.alarmAt = null;
        void this.ring?.();
      },
      Math.max(0, at - Date.now()),
    );
  }

  async deleteAlarm(): Promise<void> {
    this.stop();
    this.alarmAt = null;
  }

  private stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** A Durable Object's `ctx` over this storage. */
export function durableState(storage: MemoryStorage = new MemoryStorage()): DurableObjectState {
  return {
    storage,
    id: { toString: () => 'memory', equals: () => false },
    waitUntil: () => undefined,
    blockConcurrencyWhile: <T>(work: () => Promise<T>) => work(),
  } as unknown as DurableObjectState;
}

/** One object per name, made on first use. */
export class MemoryNamespace<T> {
  readonly objects = new Map<string, T>();
  readonly asked: string[] = [];
  private readonly make: (name: string) => T;

  constructor(make: (name: string) => T) {
    this.make = make;
  }

  getByName(name: string): T {
    this.asked.push(name);
    let object = this.objects.get(name);
    if (object === undefined) {
      object = this.make(name);
      this.objects.set(name, object);
    }
    return object;
  }

  as<N>(): N {
    return this as unknown as N;
  }
}
