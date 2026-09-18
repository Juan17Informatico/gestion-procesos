const htmlPattern = /<\/?[a-z][\s\S]*>/i;

export function isHtmlContent(value: string): boolean {
  return htmlPattern.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function plainTextToHtml(value: string): string {
  if (!value.trim()) return '';
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function normalizeNoteContent(value: string): string {
  return isHtmlContent(value) ? value : plainTextToHtml(value);
}

export function htmlToPlainText(value: string): string {
  const element = document.createElement('div');
  element.innerHTML = normalizeNoteContent(value);
  return element.textContent ?? '';
}

export function sanitizeRichTextHtml(value: string): string {
  const template = document.createElement('template');
  template.innerHTML = normalizeNoteContent(value);

  const allowedTags = new Set([
    'A',
    'BLOCKQUOTE',
    'BR',
    'BULLETLIST',
    'CODE',
    'DIV',
    'EM',
    'H1',
    'H2',
    'LI',
    'OL',
    'P',
    'STRONG',
    'U',
    'UL',
  ]);

  const visit = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(...Array.from(element.childNodes));
          return;
        }

        [...element.attributes].forEach((attribute) => {
          const isSafeLink =
            element.tagName === 'A' &&
            attribute.name === 'href' &&
            /^(https?:|mailto:|tel:)/i.test(attribute.value);
          const isLinkTarget = element.tagName === 'A' && ['target', 'rel'].includes(attribute.name);
          if (!isSafeLink && !isLinkTarget) {
            element.removeAttribute(attribute.name);
          }
        });
      }
      visit(child);
    });
  };

  visit(template.content);
  return template.innerHTML;
}
