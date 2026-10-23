'use client';

export interface InclusionTagsProps {
  included?: string[];
  excluded?: string[];
  onEdit?: () => void;
}

export function InclusionTags({ included = [], excluded = [], onEdit }: InclusionTagsProps) {
  const defaults = {
    included: ['Flights', 'Hotels', 'Transfers', 'Meals', 'Sightseeing'],
    excluded: ['Personal Expenses', 'Visa Fees', 'Travel Insurance', 'Tips & Gratuities'],
  };

  const inc = included.length > 0 ? included : defaults.included;
  const exc = excluded.length > 0 ? excluded : defaults.excluded;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Inclusions & Exclusions
        </h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {inc.map(item => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700"
          >
            <svg className="h-3 w-3 text-neutral-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {item}
          </span>
        ))}
        {exc.map(item => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700"
          >
            <svg className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
