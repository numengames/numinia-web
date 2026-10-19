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
