/**
 * Minimal ambient declaration for the WHATWG URL constructor.
 *
 * URL is part of the WinterCG minimum common API: it exists in Node, browsers,
 * and edge runtimes alike. Declaring just what we use keeps the full DOM lib
 * out of this framework-agnostic package (ADR-009).
 */
declare class URL {
  constructor(input: string, base?: string);
  readonly hostname: string;
}
