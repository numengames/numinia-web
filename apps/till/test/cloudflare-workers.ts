/**
 * `cloudflare:workers` for the tests: Node cannot resolve workerd's own
 * module, so vitest.config.ts points it here. The till uses one thing of
 * it, `WorkerEntrypoint`, which keeps the invocation's `ctx` and the
 * Worker's `env` for its methods, as workerd's class does.
 */
export class WorkerEntrypoint<Env = unknown> {
  protected readonly ctx: ExecutionContext;
  protected readonly env: Env;

  constructor(ctx: ExecutionContext, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
