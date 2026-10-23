// Formats the adults/children pax breakdown shown on the itinerary cover
// (editor preview) and PDF cover page, e.g. "18A, 3C(12y, 5y, 16y)".

export function formatPaxSummary(
  adults?: number | null,
  children?: number | null,
  childrenAges?: (number | null | undefined)[]
): string {
  const parts: string[] = [];

  if (adults && adults > 0) {
    parts.push(`${adults}A`);
  }

  if (children && children > 0) {
    const ages = (childrenAges || []).filter((age): age is number => Number.isFinite(age));
    const ageSuffix = ages.length > 0 ? `(${ages.map(age => `${age}y`).join(', ')})` : '';
    parts.push(`${children}C${ageSuffix}`);
  }

  return parts.join(', ');
}
