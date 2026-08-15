/**
 * @numinia/auth — vendor-independent, fail-closed auth core (ADR-006).
 * The thirdweb integration layer (MISSION-002, gate D14) builds on top of
 * these primitives; nothing here depends on any vendor.
 */

export * from './config.js';
export * from './encoding.js';
export * from './session.js';
export * from './nonce.js';
export * from './boundary.js';
export * from './attestation.js';
