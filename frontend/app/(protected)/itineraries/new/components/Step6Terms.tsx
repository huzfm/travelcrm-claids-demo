'use client';

import { useState } from 'react';
import { Check, Plus, X, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TermsPicker } from '@/components/itinerary/terms-picker';
import { cn } from '@/lib/utils';

const DEFAULT_INCLUSIONS = [
  'Accommodation as per itinerary',
  'Daily breakfast and dinner',
  'Private sightseeing as per itinerary',
  'Driver allowance, fuel charges & parking',
  'All applicable hotel taxes',
  'Daily breakfast',
  'Airport pick up & drop',
  'Railway station pick up & drop',
  'Shikara ride on Dal Lake (1 Hour)',
  'Gondola tickets phase I',
  'Gondola tickets both phases',
  'Abc valley union vehicle',
  'Tangmarg - Gulmarg snow chain vehicle',
];

const DEFAULT_EXCLUSIONS = [
  'Airfare / Train fare',
  'Lunch and personal expenses',
  'Monument entry tickets',
  'Pony rides & adventure activities',
  'Travel insurance',
  'Anything not mentioned under inclusions',
  'Entry fees',
  'Visa charges',
  'Gondola tickets',
  'Union vehicles in Gulmarg, Sonmarg (optional)',
];

interface Step6TermsProps {
  initialIncluded?: string[];
  initialExcluded?: string[];
  initialTerms?: string;
  onIncludedChange: (items: string[]) => void;
  onExcludedChange: (items: string[]) => void;
  onTermsChange: (terms: string) => void;
  /** Advances to the pricing step; it is pricing that creates the itinerary. */
  onSave: () => void;
  isSaving: boolean;
  onBack: () => void;
}

export function Step6Terms({
  initialIncluded = [],
  initialExcluded = [],
  initialTerms = '',
  onIncludedChange,
  onExcludedChange,
  onTermsChange,
  onSave,
  isSaving,
  onBack,
}: Step6TermsProps) {
  const [included, setIncluded] = useState(initialIncluded);
  const [excluded, setExcluded] = useState(initialExcluded);
  const [terms, setTerms] = useState(initialTerms);
  const [newIncluded, setNewIncluded] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  const addIncluded = () => {
    if (!newIncluded.trim()) return;
    const updated = [...included, newIncluded.trim()];
    setIncluded(updated);
    onIncludedChange(updated);
    setNewIncluded('');
  };

  const removeIncluded = (index: number) => {
    const updated = included.filter((_, i) => i !== index);
    setIncluded(updated);
    onIncludedChange(updated);
  };

  const addExcluded = () => {
    if (!newExcluded.trim()) return;
    const updated = [...excluded, newExcluded.trim()];
    setExcluded(updated);
    onExcludedChange(updated);
    setNewExcluded('');
  };

  const removeExcluded = (index: number) => {
    const updated = excluded.filter((_, i) => i !== index);
    setExcluded(updated);
    onExcludedChange(updated);
  };

  const togglePreset = (item: string, type: 'included' | 'excluded') => {
    if (type === 'included') {
      if (included.includes(item)) {
        removeIncluded(included.indexOf(item));
      } else {
        const updated = [...included, item];
        setIncluded(updated);
        onIncludedChange(updated);
      }
    } else {
      if (excluded.includes(item)) {
        removeExcluded(excluded.indexOf(item));
      } else {
        const updated = [...excluded, item];
        setExcluded(updated);
        onExcludedChange(updated);
      }
    }
  };

  // Select every preset at once, or — when they're all already on — clear just
  // the presets. Custom items the agent typed are left untouched either way.
  const allIncludedSelected = DEFAULT_INCLUSIONS.every(item => included.includes(item));
  const allExcludedSelected = DEFAULT_EXCLUSIONS.every(item => excluded.includes(item));

  const toggleAllPresets = (type: 'included' | 'excluded') => {
    const presets = type === 'included' ? DEFAULT_INCLUSIONS : DEFAULT_EXCLUSIONS;
    const current = type === 'included' ? included : excluded;
    const allSelected = type === 'included' ? allIncludedSelected : allExcludedSelected;
    const updated = allSelected
      ? current.filter(item => !presets.includes(item))
      : [...current, ...presets.filter(item => !current.includes(item))];
    if (type === 'included') {
      setIncluded(updated);
      onIncludedChange(updated);
    } else {
      setExcluded(updated);
      onExcludedChange(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Inclusions & Exclusions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define what&apos;s included, excluded, and any custom terms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inclusions */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-neutral-100">
                <Check className="h-4 w-4 text-neutral-600" />
              </div>
              <Label className="font-semibold">Inclusions</Label>
              <button
                type="button"
                onClick={() => toggleAllPresets('included')}
                className="ml-auto text-xs font-medium text-primary hover:underline"
              >
                {allIncludedSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_INCLUSIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => togglePreset(item, 'included')}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors',
                    included.includes(item)
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-700'
                      : 'bg-white border-border hover:border-neutral-400 hover:bg-neutral-50'
                  )}
                >
                  {included.includes(item) && <Check className="h-3 w-3 inline mr-1" />}
                  {item}
                </button>
              ))}
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Add custom</Label>
              <div className="flex gap-2">
                {/* Input renders inside its own wrapper div, so the wrapper is what grows. */}
                <div className="min-w-0 flex-1">
                  <Input
                    value={newIncluded}
                    onChange={e => setNewIncluded(e.target.value)}
                    placeholder="e.g. Breakfast included"
                    className="text-sm"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIncluded())}
                  />
                </div>
                <Button
                  type="button"
                  className="h-10"
                  onClick={addIncluded}
                  disabled={!newIncluded.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {included.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-neutral-50 rounded-md px-3 py-2 group"
                >
                  <Check className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                  <span className="text-sm flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeIncluded(i)}
                    className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {included.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No inclusions added
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exclusions */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100">
                <X className="h-4 w-4 text-red-600" />
              </div>
              <Label className="font-semibold">Exclusions</Label>
              <button
                type="button"
                onClick={() => toggleAllPresets('excluded')}
                className="ml-auto text-xs font-medium text-primary hover:underline"
              >
                {allExcludedSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_EXCLUSIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => togglePreset(item, 'excluded')}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors',
                    excluded.includes(item)
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-white border-border hover:border-red-400 hover:bg-red-50'
                  )}
                >
                  {excluded.includes(item) && <X className="h-3 w-3 inline mr-1" />}
                  {item}
                </button>
              ))}
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Add custom</Label>
              <div className="flex gap-2">
                {/* Input renders inside its own wrapper div, so the wrapper is what grows. */}
                <div className="min-w-0 flex-1">
                  <Input
                    value={newExcluded}
                    onChange={e => setNewExcluded(e.target.value)}
                    placeholder="e.g. Lunch not included"
                    className="text-sm"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExcluded())}
                  />
                </div>
                <Button
                  type="button"
                  className="h-10"
                  onClick={addExcluded}
                  disabled={!newExcluded.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {excluded.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-red-50 rounded-md px-3 py-2 group"
                >
                  <X className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="text-sm flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeExcluded(i)}
                    className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {excluded.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No exclusions added
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms & Conditions — picked from the "Edit PDF" library, plus custom */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100">
              <FileText className="h-4 w-4 text-neutral-600" />
            </div>
            <Label className="font-semibold">Terms & Conditions</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tick the points to print in this PDF — defaults from Edit PDF are pre-selected. Add your
            own points to any section, or a whole new section.
          </p>
          <TermsPicker
            value={terms}
            onChange={next => {
              setTerms(next);
              onTermsChange(next);
            }}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSaving}>
            Back
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2">
            Continue to Pricing
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
