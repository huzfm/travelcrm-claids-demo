'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePdfSettings } from '@/hooks/useSettings';
import {
  DEFAULT_PDF_TERMS,
  normalizeTermsLibrary,
  parseItineraryTerms,
  resolveItineraryTerms,
  serializeItineraryTerms,
  type TermsCategory,
  type TermsSection,
} from '@/components/itineraries/pdf/quote-layout/defaults';

/** Adds a point on Enter or the + button. */
function AddPointInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <div className="flex gap-2">
      {/* Input renders inside its own wrapper div, so the wrapper is what grows. */}
      <div className="min-w-0 flex-1">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
      </div>
      <Button type="button" className="h-10" onClick={add} disabled={!text.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CustomPoints({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item} className="group flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
          <span className="flex-1 text-sm">{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="shrink-0 p-1 text-muted-foreground transition-opacity hover:text-red-500 group-hover:opacity-100 md:opacity-0"
            aria-label="Remove point"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Picks the Terms sections printed in this itinerary's PDF from the "Edit PDF"
 * library — default points start selected — plus the agent's own points and
 * sections. `value`/`onChange` carry the itinerary's `terms` field.
 */
export function TermsPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: settings, isLoading } = usePdfSettings();
  const library = settings?.terms ? normalizeTermsLibrary(settings.terms) : DEFAULT_PDF_TERMS;
  const [newSectionTitle, setNewSectionTitle] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading terms…
      </div>
    );
  }

  const sections = resolveItineraryTerms(value, library);
  const isLibraryTitle = (title: string) => library.sections.some(c => c.title === title);
  const itemsOf = (title: string) => sections.find(s => s.title === title)?.items ?? [];
  const customSections = sections.filter(s => !isLibraryTitle(s.title));

  // Library sections first (in library order, picked points before the
  // agent's own), then the agent's own sections. A library section with
  // nothing picked is left out of the PDF entirely.
  const commit = (itemsByTitle: Map<string, string[]>, custom: TermsSection[]) => {
    const fromLibrary = library.sections
      .map((category: TermsCategory) => {
        const items = itemsByTitle.get(category.title) ?? [];
        const libraryTexts = category.points.map(p => p.text);
        return {
          title: category.title,
          items: [
            ...libraryTexts.filter(t => items.includes(t)),
            ...items.filter(t => !libraryTexts.includes(t)),
          ],
        };
      })
      .filter(s => s.items.length > 0);
    onChange(serializeItineraryTerms([...fromLibrary, ...custom]));
  };

  const currentMap = () => new Map(library.sections.map(c => [c.title, itemsOf(c.title)]));

  const setLibraryItems = (title: string, items: string[]) => {
    const map = currentMap();
    map.set(title, items);
    commit(map, customSections);
  };

  const setCustomSections = (next: TermsSection[]) => commit(currentMap(), next);

  const hasOwnPick = parseItineraryTerms(value).kind === 'selection';

  return (
    <div className="space-y-4">
      {library.sections.map(category => {
        const items = itemsOf(category.title);
        const libraryTexts = category.points.map(p => p.text);
        const ownItems = items.filter(t => !libraryTexts.includes(t));
        return (
          <div key={category.title} className="space-y-2.5 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">{category.title || 'Untitled section'}</p>
            <div className="flex flex-col gap-1.5">
              {category.points
                .filter(p => p.text.trim())
                .map(point => {
                  const picked = items.includes(point.text);
                  return (
                    <button
                      key={point.text}
                      type="button"
                      onClick={() =>
                        setLibraryItems(
                          category.title,
                          picked ? items.filter(t => t !== point.text) : [...items, point.text]
                        )
                      }
                      className={cn(
                        'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                        picked
                          ? 'border-neutral-300 bg-neutral-100 text-neutral-800'
                          : 'border-border bg-white text-muted-foreground hover:border-neutral-400 hover:bg-neutral-50'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                          picked ? 'border-neutral-700 bg-neutral-700 text-white' : 'border-neutral-300'
                        )}
                      >
                        {picked && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="flex-1">{point.text}</span>
                      {point.isDefault && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Default
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
            <CustomPoints
              items={ownItems}
              onRemove={item => setLibraryItems(category.title, items.filter(t => t !== item))}
            />
            <AddPointInput
              placeholder={`Add a custom point to ${category.title || 'this section'}`}
              onAdd={text => !items.includes(text) && setLibraryItems(category.title, [...items, text])}
            />
          </div>
        );
      })}

      {customSections.map((section, idx) => (
        <div key={idx} className="space-y-2.5 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={section.title}
                onChange={e =>
                  setCustomSections(
                    customSections.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                  )
                }
                placeholder="Section heading"
                className="text-sm font-semibold"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCustomSections(customSections.filter((_, i) => i !== idx))}
              aria-label="Remove section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <CustomPoints
            items={section.items}
            onRemove={item =>
              setCustomSections(
                customSections.map((s, i) =>
                  i === idx ? { ...s, items: s.items.filter(t => t !== item) } : s
                )
              )
            }
          />
          <AddPointInput
            placeholder="Add a point"
            onAdd={text =>
              setCustomSections(
                customSections.map((s, i) =>
                  i === idx && !s.items.includes(text) ? { ...s, items: [...s.items, text] } : s
                )
              )
            }
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[240px] flex-1">
          <Input
            value={newSectionTitle}
            onChange={e => setNewSectionTitle(e.target.value)}
            placeholder="New custom section, e.g. Hotel Policies"
            className="text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter' && newSectionTitle.trim()) {
                e.preventDefault();
                setCustomSections([...customSections, { title: newSectionTitle.trim(), items: [] }]);
                setNewSectionTitle('');
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-1.5"
          disabled={!newSectionTitle.trim()}
          onClick={() => {
            setCustomSections([...customSections, { title: newSectionTitle.trim(), items: [] }]);
            setNewSectionTitle('');
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </Button>
        {hasOwnPick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            // Empty terms = follow the "Edit PDF" defaults.
            onClick={() => onChange('')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        )}
      </div>
    </div>
  );
}
