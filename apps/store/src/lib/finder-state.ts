/**
 * Pure state helpers for the Finder island — kept framework-free so the
 * queue semantics are unit-tested without React.
 */

/** Toggle an id in the download queue, preserving insertion order. */
export function toggleQueued(queue: readonly string[], id: string): readonly string[] {
  return queue.includes(id) ? queue.filter((queued) => queued !== id) : [...queue, id];
}
