/**
 * Types for the vendored world bridge (puente-mundo.mjs, numinia-engine
 * `packages/agent/src/puente-neutral.ts`), written by hand: only what the
 * relay uses. Kept in step with the bundle when VENDOR.md's refresh is run;
 * the source of truth is the engine's `mcp-mundo.ts` and `pase-org.ts`.
 */

/** numinia.com's answer to `POST /api/agents/pass` (pase-org.ts). */
export type RespuestaPase =
  | { ok: true; pase: string; exp: number }
  | { ok: false; motivo: 'apagada' | 'rechazado' | 'red' | 'token'; texto: string };

/** Asks for a pass to enter the world `aud` (its id in numinia.com). Never throws. */
export type PedirPase = (aud: string) => Promise<RespuestaPase>;

/** One tool the bridge serves (mcp.ts `HerramientaMcp`). */
export interface HerramientaMcp {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  ejecutar: (args: Record<string, unknown>) => Promise<string> | string;
}

/** One model of a library the body may place (obra.ts `Modelo3D`). */
export interface Modelo3D {
  readonly id: string;
  readonly nombre: string;
  /** Its sha256: what the world knows it by. */
  readonly modelo: string;
}

/** One line heard near the body (kept for `oir`). */
export interface Oida {
  n: number;
  nombre: string;
  texto: string;
  canal: 'cerca' | 'zona' | 'aviso';
  ms: number;
}

/** The body's own world session, as far as the relay looks at it. */
export interface CuerpoMundo {
  readonly nombre: string | null;
}

export declare class PuenteMundo {
  readonly url: string;
  readonly id: string;
  readonly mundo: string;
  cuerpo: CuerpoMundo | null;
  /** Why it will not come back (4003, switched off, token refused), or null. */
  final: string | null;
  /** The state its last pass carried. */
  estado: 'activa' | 'dormida' | null;
  conectado: boolean;
  readonly oidas: Oida[];
  constructor(o: {
    url: string;
    id: string;
    pedirPase?: PedirPase;
    mundo?: string;
    biblioteca?: readonly Modelo3D[];
    renovarMs?: number;
    log?: (line: string) => void;
    ahora?: () => number;
  });
  get dormida(): boolean;
  /** Connect, keep the body's 20 Hz clock, come back after a drop (not after 4003). */
  arrancar(): void;
  /** Stop every timer of its own and close the connection. */
  parar(): void;
  herramientas(): HerramientaMcp[];
}

/** One JSON-RPC answer of {@link ServidorMcp} (mcp.ts). */
export type RespuestaRpc =
  | { jsonrpc: '2.0'; id: unknown; result: unknown }
  | { jsonrpc: '2.0'; id: unknown; error: { code: number; message: string } };

/** The bridge's MCP server: checks a call's arguments against the tool's schema, runs it, keeps its errors as results. */
export declare class ServidorMcp {
  constructor(o: {
    nombre: string;
    version: string;
    herramientas: () => HerramientaMcp[];
    instrucciones?: string;
    log?: (line: string) => void;
  });
  /** One parsed message → its answer (null for a notification). Never throws. */
  atender(m: unknown): Promise<RespuestaRpc | RespuestaRpc[] | null>;
}

/** What the bridge tells the model about itself (MCP initialize «instructions»). */
export declare const INSTRUCCIONES: string;

/** The token way: POST /api/agents/pass with `Authorization: Bearer <token>`. Throws on a token of the wrong shape. */
export declare function pedirPaseToken(o: {
  numiniaUrl: string;
  org: string;
  agente: string;
  token: string;
  fetcher?: typeof fetch;
}): PedirPase;

/** The `state` inside one of numinia.com's passes (read, not verified). */
export declare function estadoDelPase(pase: string): 'activa' | 'dormida' | null;

/** The shape of an access token: `ntk_` and 43 base64url characters. */
export declare const FORMA_TOKEN: RegExp;

/** How long after getting a pass the bridge renews it (8 minutes; a pass lasts 10). */
export declare const RENOVAR_PASE_MS: number;

/** The world's close code that means «do not come back by yourself». */
export declare const CIERRE_FINAL: number;
