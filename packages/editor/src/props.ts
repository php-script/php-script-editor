/**
 * Pushes framework props onto the element, but only props that changed since the last call.
 *
 * The element updates some properties itself (after the first POST it sets `persisted` and
 * `saveUrl`). Re-applying an unchanged prop on every render would undo that.
 */
export function applyChangedProps(
  element: object,
  next: Record<string, unknown>,
  previous: Map<string, unknown>,
): void {
  const target = element as Record<string, unknown>;
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || (previous.has(key) && Object.is(previous.get(key), value))) continue;
    previous.set(key, value);
    target[key] = value;
  }
}
