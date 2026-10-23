/** Which technique actually put content on the clipboard — surfaced to the
 *  caller (as a toast) so a paste-formatting bug report can say which path
 *  fired instead of guessing blind. */
export type ClipboardCopyMethod =
  | 'clipboard-item' // navigator.clipboard.write([ClipboardItem]) — rich html + plain
  | 'dom-selection' // contenteditable + Range/Selection + execCommand('copy') — rich
  | 'plain-text-fallback' // navigator.clipboard.writeText(text) — plain only, no formatting
  | 'failed';

/**
 * Copies rich HTML to the clipboard as both text/html and text/plain, so
 * pasting into Gmail/Outlook keeps formatting instead of dumping raw markup.
 * Falls back through progressively less capable browser APIs. Every caught
 * error is logged to the console (never swallowed silently) specifically so
 * a real failure here can be diagnosed from a bug report instead of guessed.
 */
export async function copyHtmlToClipboard(html: string, text: string): Promise<ClipboardCopyMethod> {
  // Primary: a real DOM selection + execCommand('copy'). This is the same
  // mechanism a manual copy-paste uses, and in practice it's the one Gmail's
  // paste handler recognizes most reliably as "rich content" — more so than
  // a hand-built ClipboardItem, which some paste targets (Gmail included, by
  // repeated observation here) seem to sometimes read only the text/plain
  // half of even when the write reports success.
  const container = document.createElement('div');
  container.setAttribute('contenteditable', 'true');
  // Visible-but-offscreen, not display:none/visibility:hidden — some
  // browsers refuse to select or copy from an element that isn't actually
  // rendered/laid out, which display:none effectively is. Width must be wide
  // enough for the actual content (not 1px): the copy serializes the content
  // as it's laid out here, so a 1px-wide container squashes any `width:100%`
  // table down to 1px before it's even copied, wrapping every word onto its
  // own line once pasted.
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '800px';
  container.style.height = 'auto';
  container.style.overflow = 'visible';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.innerHTML = html;
  document.body.appendChild(container);

  let copied = false;
  try {
    container.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);

    copied = document.execCommand('copy');
    if (!copied) {
      console.warn('[copyHtmlToClipboard] document.execCommand("copy") returned false.');
    }
    selection?.removeAllRanges();
  } catch (err) {
    console.error('[copyHtmlToClipboard] DOM-selection copy threw:', err);
    copied = false;
  } finally {
    document.body.removeChild(container);
  }

  if (copied) return 'dom-selection';

  // Fallback: the modern async Clipboard API, writing both text/html and
  // text/plain directly.
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      return 'clipboard-item';
    }
    console.warn('[copyHtmlToClipboard] ClipboardItem/navigator.clipboard.write unavailable.');
  } catch (err) {
    console.error('[copyHtmlToClipboard] navigator.clipboard.write(ClipboardItem) failed:', err);
  }

  try {
    await navigator.clipboard.writeText(text);
    console.warn(
      '[copyHtmlToClipboard] Fell all the way through to plain-text-only writeText() — rich HTML was never actually copied.'
    );
    return 'plain-text-fallback';
  } catch (err) {
    console.error('[copyHtmlToClipboard] navigator.clipboard.writeText(text) also failed:', err);
    return 'failed';
  }
}
