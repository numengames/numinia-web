/**
 * The house's library of models an AI may place (`colocar`): the engine's
 * own `features/objetos/biblioteca.json`, vendored byte for byte next to the
 * bridge (vendor/VENDOR.md). The worlds serve these same models by their
 * sha256; the bridge sends a model's hash, never a file. Only what the
 * bridge reads is kept: the id an AI names, its name and its hash.
 */
import library from '../vendor/biblioteca.json';
import type { Modelo3D } from '../vendor/puente-mundo.mjs';

/** What a body may place, in the library's order. */
export const HOUSE_LIBRARY: readonly Modelo3D[] = library.modelos.map(({ id, nombre, modelo }) => ({
  id,
  nombre,
  modelo,
}));
