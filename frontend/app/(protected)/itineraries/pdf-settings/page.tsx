'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomLastPageEditor } from '@/components/itinerary/custom-last-page-editor';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  usePdfSettings,
  useUpdatePdfSettings,
  type PDFFooterFields,
  type PDFCoverFooterFields,
  type CustomLastPageSettings,
  type PDFSettings,
} from '@/hooks/useSettings';
import {
  DEFAULT_PDF_TERMS,
  normalizeTermsLibrary,
  type PDFTermsSettings,
  type TermsCategory,
  type TermsPoint,
} from '@/components/itineraries/pdf/quote-layout/defaults';

const EMPTY_FOOTER: PDFFooterFields = {
  items: ['+91 8222899961', '+91 9682376275', 'kashmir@claidsom'],
};
const EMPTY_COVER_FOOTER: PDFCoverFooterFields = {
  companyName: '',
  tagline: '',
  cin: '',
  gst: '',
  phone: '',
};
const EMPTY_CUSTOM_LAST_PAGE: CustomLastPageSettings = { enabled: false };

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// Mirror the PDF's built-in footer colors (see the pdf/*/styles.ts palette),
// used when no color has been picked yet.
const DEFAULT_COLORS = {
  footerBg: '#db0201',
  footerText: '#FFFFFF',
  coverBanner: '#1A1A1A',
  coverBannerText: '#FFFFFF',
  coverDetails: '#F7F7F7',
  coverDetailsText: '#1A1A1A',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (next: string) => void;
}) {
  // Local text so a half-typed hex doesn't get saved (or break the swatch).
  const [text, setText] = useState(value || fallback);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value || fallback);
  }
  const current = value && HEX_COLOR.test(value) ? value : fallback;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current.toLowerCase()}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label={label}
        />
        <Input
          value={text}
          onChange={e => {
            setText(e.target.value);
            if (HEX_COLOR.test(e.target.value.trim())) onChange(e.target.value.trim().toUpperCase());
          }}
          className="font-mono uppercase"
          maxLength={7}
        />
        {value && value.toUpperCase() !== fallback && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onChange('')}
            aria-label="Reset to default color"
            title="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FooterFieldsEditor({
  value,
  onChange,
}: {
  value: PDFFooterFields;
  onChange: (next: PDFFooterFields) => void;
}) {
  const items = value.items;

  const updateItem = (index: number, next: string) => {
    onChange({ ...value, items: items.map((item, i) => (i === index ? next : item)) });
  };

  const removeItem = (index: number) => {
    onChange({ ...value, items: items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    onChange({ ...value, items: [...items, ''] });
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={e => updateItem(index, e.target.value)}
            placeholder="Phone, email, website, or anything else"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            aria-label="Remove field"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add field
      </Button>

      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        <ColorField
          label="Footer color"
          value={value.backgroundColor}
          fallback={DEFAULT_COLORS.footerBg}
          onChange={next => onChange({ ...value, backgroundColor: next })}
        />
        <ColorField
          label="Text color"
          value={value.textColor}
          fallback={DEFAULT_COLORS.footerText}
          onChange={next => onChange({ ...value, textColor: next })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Preview</p>
        <div
          className="rounded-md px-3 py-2 text-center text-xs font-bold"
          style={{
            backgroundColor: value.backgroundColor || DEFAULT_COLORS.footerBg,
            color: value.textColor || DEFAULT_COLORS.footerText,
          }}
        >
          {items.filter(Boolean).join('  |  ') || 'Footer text'}
        </div>
      </div>
    </div>
  );
}

function CoverFooterFieldsEditor({
  value,
  onChange,
}: {
  value: PDFCoverFooterFields;
  onChange: (next: PDFCoverFooterFields) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Company name"
          value={value.companyName}
          onChange={v => onChange({ ...value, companyName: v })}
          placeholder="Claids Travel"
        />
        <Field
          label="Tagline"
          value={value.tagline}
          onChange={v => onChange({ ...value, tagline: v })}
          placeholder="Trusted & Registered with the Government of India"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="CIN No."
          value={value.cin}
          onChange={v => onChange({ ...value, cin: v })}
          placeholder="U79120JK2023PTC014719"
        />
        <Field
          label="GST No."
          value={value.gst}
          onChange={v => onChange({ ...value, gst: v })}
          placeholder="01AAKCT2090E1ZP"
        />
        <Field
          label="Customer care phone"
          value={value.phone}
          onChange={v => onChange({ ...value, phone: v })}
          placeholder="+91 8222899961"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        <ColorField
          label="Banner color"
          value={value.bannerColor}
          fallback={DEFAULT_COLORS.coverBanner}
          onChange={next => onChange({ ...value, bannerColor: next })}
        />
        <ColorField
          label="Banner text color"
          value={value.bannerTextColor}
          fallback={DEFAULT_COLORS.coverBannerText}
          onChange={next => onChange({ ...value, bannerTextColor: next })}
        />
        <ColorField
          label="Details bar color"
          value={value.detailsColor}
          fallback={DEFAULT_COLORS.coverDetails}
          onChange={next => onChange({ ...value, detailsColor: next })}
        />
        <ColorField
          label="Details text color"
          value={value.detailsTextColor}
          fallback={DEFAULT_COLORS.coverDetailsText}
          onChange={next => onChange({ ...value, detailsTextColor: next })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Preview</p>
        <div className="overflow-hidden rounded-md border">
          <div
            className="px-3 py-2 text-center text-xs font-bold"
            style={{
              backgroundColor: value.bannerColor || DEFAULT_COLORS.coverBanner,
              color: value.bannerTextColor || DEFAULT_COLORS.coverBannerText,
            }}
          >
            {[value.companyName, value.tagline].filter(Boolean).join(' — ') || 'Company — Tagline'}
          </div>
          <div
            className="px-3 py-1.5 text-center text-[10px]"
            style={{
              backgroundColor: value.detailsColor || DEFAULT_COLORS.coverDetails,
              color: value.detailsTextColor || DEFAULT_COLORS.coverDetailsText,
            }}
          >
            {[
              value.cin && `Reg. CIN No : ${value.cin}`,
              value.gst && `GST No : ${value.gst}`,
              value.phone && `Customer Care No 24x7 : ${value.phone}`,
            ]
              .filter(Boolean)
              .join('   ') || 'Registration details'}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * An uploaded design image (the cover). There is no built-in
 * fallback image — with nothing uploaded, `emptyHint` says what the PDF does.
 */
function DesignImageEditor({
  value,
  onChange,
  emptyHint,
  uploadType,
  previewClassName,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  emptyHint: string;
  uploadType: string;
  previewClassName: string;
}) {
  const { uploading, upload } = useImageUpload(uploadType);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const url = await upload(file);
    if (url) {
      onChange(url);
      toast.success('Image uploaded');
    }
  };

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-md border bg-muted ${previewClassName}`}>
        {value ? (
          <Image src={value} alt="" fill sizes="320px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {value ? 'Replace image' : 'Upload image'}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{emptyHint}</span>
        )}
      </div>
    </div>
  );
}

/**
 * The Terms library: sections (heading + points). Points ticked "Default" are
 * pre-selected on every itinerary; the rest are offered as optional choices
 * in the itinerary wizard's Terms step.
 */
function TermsEditor({
  value,
  onChange,
}: {
  value: PDFTermsSettings;
  onChange: (next: PDFTermsSettings) => void;
}) {
  const sections = value.sections;

  const setSection = (index: number, next: TermsCategory) =>
    onChange({ ...value, sections: sections.map((s, i) => (i === index ? next : s)) });

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => {
        const setPoint = (pIdx: number, next: Partial<TermsPoint>) =>
          setSection(sIdx, {
            ...section,
            points: section.points.map((p, i) => (i === pIdx ? { ...p, ...next } : p)),
          });
        return (
          <div key={sIdx} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              {/* Input/Textarea render inside their own wrapper div, so the
                  wrapper (not the field) is what has to grow in a flex row. */}
              <div className="min-w-0 flex-1">
                <Input
                  value={section.title}
                  onChange={e => setSection(sIdx, { ...section, title: e.target.value })}
                  placeholder="Heading, e.g. Cancellation Policy"
                  className="font-medium"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange({ ...value, sections: sections.filter((_, i) => i !== sIdx) })}
                aria-label="Remove section"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {section.points.map((point, pIdx) => (
              <div key={pIdx} className="flex items-start gap-2 pl-1">
                <label
                  className="mt-2 flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
                  title="Default points are pre-selected on every itinerary"
                >
                  <input
                    type="checkbox"
                    checked={point.isDefault}
                    onChange={e => setPoint(pIdx, { isDefault: e.target.checked })}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Default
                </label>
                <div className="min-w-0 flex-1">
                  <Textarea
                    value={point.text}
                    onChange={e => setPoint(pIdx, { text: e.target.value })}
                    placeholder="Point text"
                    rows={2}
                    // Grows with the text where supported; 2 lines minimum.
                    className="min-h-[60px] text-sm [field-sizing:content]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    setSection(sIdx, {
                      ...section,
                      points: section.points.filter((_, i) => i !== pIdx),
                    })
                  }
                  aria-label="Remove point"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setSection(sIdx, {
                  ...section,
                  points: [...section.points, { text: '', isDefault: false }],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add point
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange({ ...value, sections: [...sections, { title: '', points: [] }] })}
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange(DEFAULT_PDF_TERMS)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to default
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Office address (contact card)</Label>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={value.address}
              onChange={e => onChange({ ...value, address: e.target.value })}
              placeholder="Street, city, state, PIN"
            />
          </div>
          {value.address && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ ...value, address: '' })}
              aria-label="Clear address"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PDF-wide settings shared by every itinerary — reached from the main
 * sidebar's "Edit PDF" entry. The cover design, footer strip, terms and last
 * page apply to all itineraries at once, not per trip.
 */
export default function PdfSettingsPage() {
  const { data: saved, isLoading } = usePdfSettings();
  const updateSettings = useUpdatePdfSettings();

  const [draft, setDraft] = useState<PDFSettings | null>(null);
  // Re-seeds the draft once the saved settings load — a render-phase state
  // update (React's documented alternative to an effect here) so the page
  // never briefly renders empty fields before the fetch resolves.
  const [seeded, setSeeded] = useState(false);
  if (!isLoading && saved && !seeded) {
    setSeeded(true);
    setDraft(saved);
  }

  const hasChanges =
    draft !== null && saved !== undefined && JSON.stringify(draft) !== JSON.stringify(saved);

  const handleSave = async () => {
    if (!draft) return;
    try {
      // The server tidies what it stores (e.g. drops blank bullet lines), so
      // the draft follows the saved copy or "Save" would never disable.
      setDraft(await updateSettings.mutateAsync(draft));
      toast.success('PDF settings updated');
    } catch {
      toast.error('Failed to update PDF settings');
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Edit PDF"
        description="Settings shared by every itinerary's PDF — cover, footers, terms and last page."
      />

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold">Cover page</h3>
            <p className="text-sm text-muted-foreground">
              A full-page A4 portrait design (about 1414 × 2000 px) with your logo and headline.
              Keep the bottom quarter plain white — the trip ID, guest, dates and consultant, and
              the cover page footer below, are printed there.
            </p>
            <DesignImageEditor
              value={draft?.coverImage ?? null}
              onChange={next => draft && setDraft({ ...draft, coverImage: next })}
              emptyHint="Not set — the PDF uses a plain cover with your company name and destination."
              uploadType="cover"
              previewClassName="aspect-[1414/2000] w-40"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold">Cover page footer</h3>
            <p className="text-sm text-muted-foreground">
              The banner at the bottom of the cover page — company tagline plus registration
              details.
            </p>
            <CoverFooterFieldsEditor
              value={draft?.coverFooter ?? EMPTY_COVER_FOOTER}
              onChange={next => draft && setDraft({ ...draft, coverFooter: next })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold">Other pages footer</h3>
            <p className="text-sm text-muted-foreground">
              Shown on every page except the cover — independent of the cover footer above.
            </p>
            <FooterFieldsEditor
              value={draft?.footer ?? EMPTY_FOOTER}
              onChange={next => draft && setDraft({ ...draft, footer: next })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold">Terms and Conditions</h3>
            <p className="text-sm text-muted-foreground">
              The points agents choose from in the itinerary&apos;s Terms step — terms,
              cancellation policy, supplement costs, bank details. Points ticked
              &quot;Default&quot; are pre-selected on every itinerary; the rest are optional. Agents
              can also add their own points and sections per itinerary.
            </p>
            <TermsEditor
              value={draft?.terms ? normalizeTermsLibrary(draft.terms) : DEFAULT_PDF_TERMS}
              onChange={next => draft && setDraft({ ...draft, terms: next })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold">Last page</h3>
            <p className="text-sm text-muted-foreground">
              The closing page — a Thank You page (logo, thank-you message, promise, prepared by,
              contact details and social links), or your own image.
            </p>
            <CustomLastPageEditor
              value={draft?.customLastPage ?? EMPTY_CUSTOM_LAST_PAGE}
              onChange={next => draft && setDraft({ ...draft, customLastPage: next })}
              fallbackAccent={draft?.footer?.backgroundColor || DEFAULT_COLORS.footerBg}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
