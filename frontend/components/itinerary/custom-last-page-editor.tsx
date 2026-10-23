'use client';

import { useRef } from 'react';
import NextImage from 'next/image';
import { Image as ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useImageUpload } from '@/hooks/useImageUpload';
import { COMPANY_EMAIL, COMPANY_PHONE_TEXT } from '@/components/itineraries/pdf/company';
import type { CustomLastPageSettings, ThankYouPageContent } from '@/hooks/useSettings';

/** Filled in the first time the image page is switched on, so the admin edits rather than starts blank. */
const STARTER: Omit<CustomLastPageSettings, 'enabled' | 'imageUrl'> = {
  text: 'Thank you, {clientName}! We look forward to creating unforgettable travel experiences for you.',
  facebookUrl: '',
  instagramUrl: '',
  websiteUrl: '',
};

/** The structured Thank You page's starting content — the reference layout. */
const THANK_YOU_STARTER: ThankYouPageContent = {
  showLogo: false,
  logoUrl: '',
  title: 'Thank you, {clientName}',
  message:
    'Thank you for choosing {companyName}. We look forward to creating unforgettable travel experiences for you.',
  promiseTitle: '{companyName} Promise',
  promiseItems: [
    'No Hidden Charges',
    'Dedicated Trip Coordinator',
    'Real Time Support',
    'Trusted Local Partners',
    'Safe & Comfortable Travel',
  ],
  preparedByName: '{companyName}',
  preparedBySubtitle: 'India',
  contacts: [
    { label: 'Phone', value: COMPANY_PHONE_TEXT },
    { label: 'Email', value: COMPANY_EMAIL },
    { label: 'Address', value: '{address}' },
  ],
  socials: [
    { label: 'Instagram', url: '' },
    { label: 'Facebook', url: '' },
  ],
  accentColor: '',
};

const PLACEHOLDERS = ['{clientName}', '{branchName}', '{whatsapp}', '{email}'];
const THANK_YOU_PLACEHOLDERS = ['{clientName}', '{companyName}', '{phone}', '{email}', '{address}'];

const LINKS: { key: 'facebookUrl' | 'instagramUrl' | 'websiteUrl'; label: string }[] = [
  { key: 'facebookUrl', label: 'Facebook link' },
  { key: 'instagramUrl', label: 'Instagram link' },
  { key: 'websiteUrl', label: 'Website link' },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const PlaceholderHint = ({ tokens }: { tokens: string[] }) => (
  <p className="text-xs text-muted-foreground">
    You can use{' '}
    {tokens.map((p, i) => (
      <span key={p}>
        {i > 0 && ', '}
        <code className="rounded bg-muted px-1 py-0.5 text-foreground">{p}</code>
      </span>
    ))}{' '}
    in any text — filled in per itinerary.
  </p>
);

/** Upload / replace / remove one image, with a small preview. */
function ImagePicker({
  value,
  onChange,
  buttonLabel,
  previewClassName,
  objectFit = 'cover',
}: {
  value?: string;
  onChange: (next: string) => void;
  buttonLabel: string;
  previewClassName: string;
  objectFit?: 'cover' | 'contain';
}) {
  const { uploading, upload } = useImageUpload('custom-last-page');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative shrink-0 overflow-hidden rounded-md border bg-muted ${previewClassName}`}
      >
        {value ? (
          <NextImage
            src={value}
            alt=""
            fill
            sizes="96px"
            className={objectFit === 'contain' ? 'object-contain' : 'object-cover'}
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
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
        {value ? 'Replace' : buttonLabel}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => onChange('')}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </Button>
      )}
    </div>
  );
}

/** Editable rows of two fields each, e.g. contact label + value. */
function PairList<T extends { [K in keyof T]: string }>({
  rows,
  fields,
  empty,
  addLabel,
  onChange,
}: {
  rows: T[];
  fields: { key: keyof T & string; placeholder: string; className: string }[];
  empty: T;
  addLabel: string;
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {fields.map(field => (
            <div key={field.key} className={field.className}>
              <Input
                value={row[field.key]}
                onChange={e =>
                  onChange(
                    rows.map((r, i) => (i === idx ? ({ ...r, [field.key]: e.target.value } as T) : r))
                  )
                }
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onChange(rows.filter((_, i) => i !== idx))}
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange([...rows, { ...empty }])}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Small HTML mock of the PDF page, so the admin sees the layout while editing. */
function ThankYouPreview({ value, accent }: { value: ThankYouPageContent; accent: string }) {
  const sample = (text: string) =>
    text
      .replace(/\{clientName\}/g, 'Rahul Verma')
      .replace(/\{companyName\}|\{branchName\}/g, 'Tripoday Holidays')
      .replace(/\{phone\}|\{whatsapp\}/g, COMPANY_PHONE_TEXT)
      .replace(/\{email\}/g, COMPANY_EMAIL)
      .replace(/\{address\}/g, 'Office address');
  const promiseItems = value.promiseItems.filter(i => i.trim());
  const contacts = value.contacts.filter(c => c.value.trim());
  const socials = value.socials.filter(s => s.label.trim() && s.url.trim());

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border bg-white px-4 py-6 text-center text-[#111827]">
      {value.showLogo && (
        <div className="relative h-28 w-48">
          {value.logoUrl ? (
            <NextImage src={value.logoUrl} alt="" fill sizes="192px" className="object-contain" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded bg-muted text-[9px] text-muted-foreground">
              Logo
            </span>
          )}
        </div>
      )}
      {value.title.trim() && (
        <p className="text-xl font-bold" style={{ color: accent }}>
          {sample(value.title)}
        </p>
      )}
      {value.message.trim() && <p className="max-w-sm text-xs">{sample(value.message)}</p>}
      {(value.title.trim() || value.message.trim()) && (
        <div className="h-[3px] w-12" style={{ backgroundColor: accent }} />
      )}
      {(value.promiseTitle.trim() || promiseItems.length > 0) && (
        <div
          className="w-full max-w-sm rounded border px-3 py-2"
          style={{ backgroundColor: `${accent}1a`, borderColor: `${accent}40` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
            {sample(value.promiseTitle)}
          </p>
          <p className="text-[10px]">{promiseItems.map(sample).join('  |  ')}</p>
        </div>
      )}
      {(value.preparedByName.trim() || value.preparedBySubtitle.trim()) && (
        <div className="w-full max-w-xs rounded-md border bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Prepared By</p>
          <p className="text-sm font-bold" style={{ color: accent }}>
            {sample(value.preparedByName)}
          </p>
          <p className="text-[10px] text-slate-500">{sample(value.preparedBySubtitle)}</p>
        </div>
      )}
      {contacts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Contact Information</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {contacts.map((c, i) => (
              <div key={i} className="rounded border px-2 py-1">
                <p className="text-[9px] text-slate-500">{sample(c.label)}</p>
                <p className="text-[10px]">{sample(c.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {socials.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Follow Us</p>
          <p className="text-[10px] font-bold underline" style={{ color: accent }}>
            {socials.map(s => s.label).join('  •  ')}
          </p>
        </div>
      )}
    </div>
  );
}

function ThankYouEditor({
  value,
  onChange,
  fallbackAccent,
}: {
  value: ThankYouPageContent;
  onChange: (next: ThankYouPageContent) => void;
  fallbackAccent: string;
}) {
  const set = (patch: Partial<ThankYouPageContent>) => onChange({ ...value, ...patch });
  const accent = value.accentColor && HEX_COLOR.test(value.accentColor) ? value.accentColor : fallbackAccent;

  return (
    <div className="space-y-3">
      <PlaceholderHint tokens={THANK_YOU_PLACEHOLDERS} />

      <Section title="Logo" hint="Shown above the thank-you title.">
        <div className="flex items-center justify-between">
          <span className="text-sm">Show logo</span>
          <Switch checked={value.showLogo} onCheckedChange={showLogo => set({ showLogo })} />
        </div>
        {value.showLogo && (
          <>
            <ImagePicker
              value={value.logoUrl}
              onChange={logoUrl => set({ logoUrl })}
              buttonLabel="Upload logo"
              previewClassName="h-16 w-16"
              objectFit="contain"
            />
            <p className="text-xs text-muted-foreground">
              Nothing uploaded uses the company logo from the contact card.
            </p>
          </>
        )}
      </Section>

      <Section title="Thank you message">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={value.title}
            onChange={e => set({ title: e.target.value })}
            placeholder="Thank you, {clientName}"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Textarea
            value={value.message}
            onChange={e => set({ message: e.target.value })}
            className="min-h-16 resize-none"
            maxLength={400}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Title color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent.toLowerCase()}
              onChange={e => set({ accentColor: e.target.value.toUpperCase() })}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
              aria-label="Title color"
            />
            <span className="font-mono text-xs uppercase">{accent}</span>
            {value.accentColor && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ accentColor: '' })}>
                Use footer color
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Promise" hint="The tinted strip under the message. Leave empty to hide it.">
        <Input
          value={value.promiseTitle}
          onChange={e => set({ promiseTitle: e.target.value })}
          placeholder="{companyName} Promise"
        />
        <PairList
          rows={value.promiseItems.map(text => ({ text }))}
          fields={[{ key: 'text', placeholder: 'e.g. No Hidden Charges', className: 'min-w-0 flex-1' }]}
          empty={{ text: '' }}
          addLabel="Add point"
          onChange={rows => set({ promiseItems: rows.map(r => r.text) })}
        />
      </Section>

      <Section title="Prepared by" hint="Leave both empty to hide the card.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            value={value.preparedByName}
            onChange={e => set({ preparedByName: e.target.value })}
            placeholder="Name, e.g. Main Office"
          />
          <Input
            value={value.preparedBySubtitle}
            onChange={e => set({ preparedBySubtitle: e.target.value })}
            placeholder="Line below, e.g. India"
          />
        </div>
      </Section>

      <Section title="Contact information" hint="One card each — email, phone, address or anything else.">
        <PairList
          rows={value.contacts}
          fields={[
            { key: 'label', placeholder: 'Label, e.g. Email', className: 'w-32 shrink-0' },
            { key: 'value', placeholder: 'Value', className: 'min-w-0 flex-1' },
          ]}
          empty={{ label: '', value: '' }}
          addLabel="Add contact"
          onChange={contacts => set({ contacts })}
        />
      </Section>

      <Section title="Follow us" hint="Clickable links in the PDF. A link without a URL is hidden.">
        <PairList
          rows={value.socials}
          fields={[
            { key: 'label', placeholder: 'Label, e.g. Instagram', className: 'w-32 shrink-0' },
            { key: 'url', placeholder: 'https://…', className: 'min-w-0 flex-1' },
          ]}
          empty={{ label: '', url: '' }}
          addLabel="Add link"
          onChange={socials => set({ socials })}
        />
      </Section>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Preview</p>
        <ThankYouPreview value={value} accent={accent} />
      </div>
    </div>
  );
}

/**
 * Editor for the last page of every itinerary PDF: either the structured
 * Thank You page, or one large image with a text box and three buttons.
 */
export function CustomLastPageEditor({
  value,
  onChange,
  fallbackAccent,
}: {
  value: CustomLastPageSettings;
  onChange: (next: CustomLastPageSettings) => void;
  /** Title color used when none is picked — the footer bar color. */
  fallbackAccent: string;
}) {
  const layout = value.layout ?? 'image';

  const handleToggle = (enabled: boolean) => {
    const neverUsed = value.layout === undefined && !value.imageUrl && value.text === undefined;
    onChange(
      enabled && neverUsed
        ? { ...value, enabled, layout: 'thankYou', thankYou: value.thankYou ?? THANK_YOU_STARTER }
        : { ...value, enabled }
    );
  };

  const setLayout = (next: 'thankYou' | 'image') => {
    if (next === 'thankYou') {
      onChange({ ...value, layout: next, thankYou: value.thankYou ?? THANK_YOU_STARTER });
    } else {
      const neverFilled = LINKS.every(l => value[l.key] === undefined) && value.text === undefined;
      onChange(neverFilled ? { ...STARTER, ...value, layout: next } : { ...value, layout: next });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Add a last page</p>
          <p className="text-xs text-muted-foreground">
            When on, this page closes every itinerary&apos;s PDF. When off, the PDF has no last
            page.
          </p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={handleToggle} />
      </div>

      {value.enabled && (
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(
            [
              { key: 'thankYou', label: 'Thank You page' },
              { key: 'image', label: 'Image page' },
            ] as const
          ).map(option => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={layout === option.key ? 'default' : 'ghost'}
              onClick={() => setLayout(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {value.enabled && layout === 'thankYou' && (
        <ThankYouEditor
          value={value.thankYou ?? THANK_YOU_STARTER}
          onChange={thankYou => onChange({ ...value, thankYou })}
          fallbackAccent={fallbackAccent}
        />
      )}

      {value.enabled && layout === 'image' && (
        <>
          <div className="space-y-2">
            <Label>Image (covers most of the page)</Label>
            <ImagePicker
              value={value.imageUrl}
              onChange={imageUrl => onChange({ ...value, imageUrl })}
              buttonLabel="Upload image"
              previewClassName="h-24 w-[4.5rem]"
            />
            <p className="text-xs text-muted-foreground">
              Only an image: it fills the whole last page. With text: the image covers about 80% of
              the page, with your text and link buttons below.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Text</Label>
            <Textarea
              value={value.text || ''}
              onChange={e => onChange({ ...value, text: e.target.value })}
              placeholder="e.g. Thank you, {clientName}!"
              className="min-h-16 resize-none"
              maxLength={200}
            />
            <PlaceholderHint tokens={PLACEHOLDERS} />
          </div>

          <div className="space-y-2">
            <Label>Buttons</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {LINKS.map(link => (
                <div key={link.key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{link.label}</p>
                  <Input
                    value={value[link.key] || ''}
                    onChange={e => onChange({ ...value, [link.key]: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave a link empty to hide that button.</p>
          </div>
        </>
      )}
    </div>
  );
}
