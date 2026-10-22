/**
 * GitStateStore — git as the database.
 * One JSON file per entity in a private repo, read and written through the
 * GitHub contents API. Every write is SHA-conditional (blind overwrites are
 * impossible) and carries the acting wallet in the commit trailer, so the
 * audit log is the git history itself.
 */

import type { z } from 'zod';
import type { StateEnv } from './config.js';
import { fromBase64, toBase64 } from './encoding.js';

export class StateHttpError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`State store request failed (${status}): ${detail}`);
    this.name = 'StateHttpError';
  }
}

/** The file moved under our feet — re-read and retry with the fresh sha. */
export class StateConflictError extends Error {
  constructor(path: string) {
    super(`Concurrent write on ${path}: re-read the record and retry`);
    this.name = 'StateConflictError';
  }
}

export interface ReadResult<T> {
  readonly record: T;
  readonly sha: string;
}

export interface WriteOptions {
  /** Commit subject line; the actor trailer is appended automatically. */
  readonly message: string;
  /** The wallet whose session performs the write — the pen, audited. */
  readonly actor: string;
  /** Current file sha when updating; omit only when creating. */
  readonly sha?: string;
}

export class GitStateStore {
  constructor(
    private readonly env: StateEnv,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private url(path: string): string {
    return `https://api.github.com/repos/${this.env.owner}/${this.env.repo}/contents/${path}`;
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.env.token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'numinia-state',
    };
  }

  /** null on 404 (absence is an answer); loud on everything else. */
  async read<Schema extends z.ZodType>(
    path: string,
    schema: Schema,
  ): Promise<ReadResult<z.infer<Schema>> | null> {
    const response = await this.fetchImpl(`${this.url(path)}?ref=${this.env.branch}`, {
      headers: this.headers(),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new StateHttpError(response.status, `GET ${path}`);
    const body = (await response.json()) as { content: string; sha: string };
    const bytes = fromBase64(body.content);
    if (bytes === null) throw new StateHttpError(response.status, `undecodable content at ${path}`);
    const record: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return { record: schema.parse(record), sha: body.sha };
  }

  /**
   * The file names directly inside a directory, [] when it does not exist
   * (a 404 is an answer). GitHub's contents API lists a directory in one
   * call, at most 1000 entries; the store never pages, so a larger one
   * answers its first thousand.
   */
  async list(dir: string): Promise<string[]> {
    const response = await this.fetchImpl(`${this.url(dir)}?ref=${this.env.branch}`, {
      headers: this.headers(),
    });
    if (response.status === 404) return [];
    if (!response.ok) throw new StateHttpError(response.status, `GET ${dir}`);
    const body = (await response.json()) as unknown;
    if (!Array.isArray(body))
      throw new StateHttpError(response.status, `${dir} is not a directory`);
    return (body as { type?: unknown; name?: unknown }[]).flatMap((entry) =>
      entry.type === 'file' && typeof entry.name === 'string' ? [entry.name] : [],
    );
  }

  /** Returns the new file sha. Conflicts (409/422) are typed for retry. */
  async write(path: string, record: unknown, options: WriteOptions): Promise<string> {
    const content = toBase64(new TextEncoder().encode(JSON.stringify(record, null, 2)));
    const response = await this.fetchImpl(this.url(path), {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        message: `${options.message}\n\nActing-Wallet: ${options.actor}`,
        content,
        branch: this.env.branch,
        ...(options.sha !== undefined ? { sha: options.sha } : {}),
      }),
    });
    if (response.status === 409 || response.status === 422) throw new StateConflictError(path);
    if (!response.ok) throw new StateHttpError(response.status, `PUT ${path}`);
    const body = (await response.json()) as { content: { sha: string } };
    return body.content.sha;
  }
}
