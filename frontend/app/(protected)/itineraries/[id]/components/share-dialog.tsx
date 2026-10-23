'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SHARE_OPTIONS,
  SHARE_OPTION_GROUPS,
  buildEmailBodyHtml,
  buildEmailHtml,
  buildEmailSubject,
  buildEmailText,
  buildWhatsAppMessage,
  type ShareItineraryData,
  type ShareOptions,
} from '@/lib/itinerary-share-format';

// Base64 inflates a file by ~33%, and the server's JSON body limit is 100mb —
// this leaves headroom for that inflation plus the rest of the request body.
const MAX_SHARE_PDF_BYTES = 70 * 1024 * 1024;

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareItineraryData;
  recipientPhone: string;
  leadPhone?: string;
  leadEmail?: string;
  onPhoneChange: (phone: string) => void;
  /** Sends a picked PDF over the WhatsApp Business API. */
  onSendDocument: (base64Data: string, fileName: string) => Promise<void>;
  /** Sends the generated text over the WhatsApp Business API. */
  onSendText?: (phone: string, message: string) => Promise<void>;
  onDownloadPdf?: () => void;
  isSending: boolean;
}

/* ─── toggles ──────────────────────────────────────────────────────────── */

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      title={hint}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        checked
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
      )}
    >
      <span
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
        )}
      >
        {checked && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
      </span>
      {label}
    </button>
  );
}

/**
 * Puts the email on the clipboard as rich text.
 *
 * Writing a `text/html` flavour is what makes Gmail, Outlook and Apple Mail
 * paste the styled email — colours, fonts and tables — rather than markup or
 * flat text. `mailto:` cannot carry HTML at all (RFC 6068 defines its body as
 * plain text), so this is the only route to a styled message without a mail
 * server. The `ClipboardItem` path needs a secure context; the selection
 * fallback covers browsers without it.
 */
async function copyRichText(html: string, plain: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
    return;
  }

  const holder = document.createElement('div');
  holder.contentEditable = 'true';
  holder.innerHTML = html;
  holder.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(holder);
  try {
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('copy');
    selection?.removeAllRanges();
  } finally {
    holder.remove();
  }
}

/** Copies text and flips the button to a tick for a moment. */
function CopyButton({
  value,
  label,
  icon: Icon = Copy,
  variant = 'outline',
}: {
  value: string;
  label: string;
  icon?: typeof Copy;
  variant?: 'outline' | 'default';
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error('Could not copy — your browser blocked clipboard access');
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}

function CopyStyledButton({ html, plain }: { html: string; plain: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="sm"
      className="gap-2"
      onClick={async () => {
        try {
          await copyRichText(html, plain);
          setCopied(true);
          toast.success('Styled email copied — paste it into Gmail or Outlook');
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error('Could not copy — your browser blocked clipboard access');
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      Copy styled email
    </Button>
  );
}

/* ─── dialog ───────────────────────────────────────────────────────────── */

export function ShareDialog({
  open,
  onOpenChange,
  data,
  recipientPhone,
  leadPhone,
  leadEmail,
  onPhoneChange,
  onSendDocument,
  onSendText,
  onDownloadPdf,
  isSending,
}: ShareDialogProps) {
  const [options, setOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS);
  const [emailTo, setEmailTo] = useState('');
  const [showHtml, setShowHtml] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const safely = <T,>(build: () => T, fallback: T): T => {
    try {
      return build();
    } catch (error) {
      console.error('Could not build the share preview', error);
      return fallback;
    }
  };

  const whatsappText = useMemo(
    () => safely(() => buildWhatsAppMessage(data, options), 'Could not build this preview.'),
    [data, options]
  );
  const emailHtml = useMemo(
    () => safely(() => buildEmailHtml(data, options), '<p>Could not build this preview.</p>'),
    [data, options]
  );
  // The clipboard gets the fragment, never the document — see buildEmailHtml.
  const emailBody = useMemo(
    () => safely(() => buildEmailBodyHtml(data, options), '<p>Could not build this preview.</p>'),
    [data, options]
  );
  const emailText = useMemo(
    () => safely(() => buildEmailText(data, options), 'Could not build this preview.'),
    [data, options]
  );
  const subject = useMemo(() => safely(() => buildEmailSubject(data), 'Your itinerary'), [data]);

  const phone = (recipientPhone || leadPhone || '').replace(/\D/g, '');
  const toggle = (key: keyof ShareOptions) =>
    setOptions(previous => ({ ...previous, [key]: !previous[key] }));

  const openInWhatsApp = () => {
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener');
  };

  const openInMailClient = () => {
    // mailto can only carry plain text, and long bodies get truncated by some
    // clients — the HTML is on the clipboard for anything richer.
    const to = emailTo || leadEmail || '';
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(emailText)}`;
  };

  const openPreviewTab = () => {
    const blob = new Blob([emailHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // The tab has loaded by the time this runs; holding the URL any longer
    // just leaks it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const sendText = async () => {
    if (!onSendText) return;
    if (!phone) {
      toast.error('Add a phone number first');
      return;
    }
    setIsProcessing(true);
    try {
      await onSendText(phone, whatsappText);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendPdf = async () => {
    if (!selectedFile) return;
    if (!phone) {
      toast.error('Add a phone number first');
      return;
    }
    setIsProcessing(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((text, byte) => text + String.fromCharCode(byte), '')
      );
      await onSendDocument(`data:application/pdf;base64,${base64}`, selectedFile.name);
      setSelectedFile(null);
    } catch {
      toast.error('Could not send the PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isSending || isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[900px] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Package
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="whatsapp" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-5 pt-3">
            <TabsList className="h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="whatsapp" className="gap-2 px-3 py-1.5">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2 px-3 py-1.5">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2 px-3 py-1.5">
                <Upload className="h-4 w-4" />
                Send PDF
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Toggles — they drive both the WhatsApp text and the email */}
          <div className="border-b bg-muted/20 px-5 py-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Use the toggles to customise what the client sees.
            </p>
            <div className="space-y-2">
              {SHARE_OPTION_GROUPS.map(group => (
                <div key={group.label} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                  {group.options.map(option => (
                    <Toggle
                      key={option.key}
                      label={option.label}
                      hint={option.hint}
                      checked={options[option.key]}
                      onChange={() => toggle(option.key)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── WhatsApp ── */}
          <TabsContent value="whatsapp" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f4f3] p-4 dark:bg-muted/40">
              <div className="mx-auto max-w-lg rounded-xl rounded-tl-sm bg-[#fbe3e3] px-4 py-3 shadow-sm">
                <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-[#121111]">
                  {whatsappText}
                </pre>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t px-5 py-3">
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <Label className="text-xs">Client&apos;s WhatsApp number</Label>
                <Input
                  placeholder="919876543210"
                  value={recipientPhone || leadPhone || ''}
                  onChange={event => onPhoneChange(event.target.value)}
                  className="h-9 font-mono"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={whatsappText} label="Copy text" />
                <Button variant="outline" size="sm" onClick={openInWhatsApp} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in WhatsApp
                </Button>
                {onSendText && (
                  <Button size="sm" onClick={sendText} disabled={busy} className="gap-2">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send now
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Email ── */}
          <TabsContent value="email" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-100 p-4 dark:bg-muted/40">
              {showHtml ? (
                <pre className="whitespace-pre-wrap break-all rounded-lg bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {emailHtml}
                </pre>
              ) : (
                <iframe
                  title="Email preview"
                  srcDoc={emailHtml}
                  className="h-[420px] w-full rounded-lg border bg-white"
                  sandbox=""
                />
              )}
            </div>

            <div className="space-y-2 border-t px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Copy the styled email, then paste it into Gmail or Outlook — the colours and
                fonts come across. Compose opens your mail app with a plain-text copy, which is
                all a mailto link can carry.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1 space-y-1.5">
                  <Label className="text-xs">Client&apos;s email</Label>
                  <Input
                    type="email"
                    placeholder={leadEmail || 'client@example.com'}
                    value={emailTo}
                    onChange={event => setEmailTo(event.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHtml(previous => !previous)}
                    className="gap-2"
                  >
                    <Code2 className="h-4 w-4" />
                    {showHtml ? 'Preview' : 'HTML'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={openPreviewTab} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                  <CopyButton value={emailHtml} label="Source" icon={Code2} />
                  <Button variant="outline" size="sm" onClick={openInMailClient} className="gap-2">
                    <Mail className="h-4 w-4" />
                    Compose
                  </Button>
                  <CopyStyledButton html={emailBody} plain={emailText} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── PDF over the WhatsApp Business API ── */}
          <TabsContent value="pdf" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-sm text-muted-foreground">
                Download the itinerary PDF, then attach it here to send it to the client&apos;s
                WhatsApp.
              </p>

              {onDownloadPdf && (
                <Button variant="outline" onClick={onDownloadPdf} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Attach PDF</Label>
                <label
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                    selectedFile
                      ? 'border-success/50 bg-success/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.type !== 'application/pdf') {
                        toast.error('Please choose a PDF file');
                        return;
                      }
                      if (file.size > MAX_SHARE_PDF_BYTES) {
                        toast.error(
                          `That PDF is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the maximum size for sending over WhatsApp is ${MAX_SHARE_PDF_BYTES / (1024 * 1024)} MB.`
                        );
                        return;
                      }
                      setSelectedFile(file);
                    }}
                  />
                  {selectedFile ? (
                    <>
                      <Check className="h-6 w-6 text-success" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm">Choose a PDF file</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t px-5 py-3">
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <Label className="text-xs">Client&apos;s WhatsApp number</Label>
                <Input
                  placeholder="919876543210"
                  value={recipientPhone || leadPhone || ''}
                  onChange={event => onPhoneChange(event.target.value)}
                  className="h-9 font-mono"
                />
              </div>
              <Button onClick={sendPdf} disabled={!selectedFile || busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
