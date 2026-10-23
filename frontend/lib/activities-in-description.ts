/**
 * The new-itinerary wizard writes each added activity into the day description
 * as its own line, so the description bullets already list it. Renderers that
 * also print the activities list use this to skip those, so nothing shows twice.
 */
export function activitiesNotInDescription<T extends { title?: string; name?: string }>(
  activities: T[] | undefined,
  description: string | undefined
): T[] {
  const list = activities ?? [];
  if (!description) return list;
  const normalize = (s: string) =>
    s
      .replace(/^[\s•\-*▸]+/, '')
      .trim()
      .toLowerCase();
  const lines = new Set(description.split('\n').map(normalize).filter(Boolean));
  return list.filter(a => {
    const label = normalize(a.title ?? a.name ?? '');
    return !label || !lines.has(label);
  });
}
