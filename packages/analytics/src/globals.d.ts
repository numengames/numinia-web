/**
 * Minimal ambient declaration for the WHATWG URL constructor (WinterCG
 * minimum common API) — keeps the full DOM lib out of this package.
 */
declare class URL {
  constructor(input: string, base?: string);
  readonly hostname: string;
}
