/**
 * `cloudflare:workers` for the tests: Node cannot resolve workerd's own
 * module, so vitest.config.ts points it here. The OAuth library imports
 * `WorkerEntrypoint` to tell a class handler from an object one; the relay
 * hands it objects, so the stand-in only has to exist and keep `ctx` and
 * `env`, as workerd's class does.
 */
export class WorkerEntrypoint<Env = unknown> {
  protected readonly ctx: ExecutionContext;
  protected readonly env: Env;

  constructor(ctx: ExecutionContext, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

/**
 * workerd's Durable Object base class keeps `ctx` (the object's state and
 * storage) and `env` the same way; the bodies' tests hand it an in-memory
 * state (test/memory-durable.ts).
 */
export class DurableObject<Env = unknown> {
  protected readonly ctx: DurableObjectState;
  protected readonly env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
