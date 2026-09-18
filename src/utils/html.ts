const htmlPattern = /<\/?[a-z][\s\S]*>/i;
const allowedHighlightColors = [
  '#fef3c7',
  '#fed7aa',
  '#fecdd3',
  '#fbcfe8',
  '#ddd6fe',
  '#bfdbfe',
  '#bae6fd',
  '#a5f3fc',
  '#bbf7d0',
  '#d9f99d',
  '#ecfccb',
  '#e7e5e4',
];

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

function normalizeCssColor(value: string): string {
  const element = document.createElement('span');
  element.style.backgroundColor = value;
  return element.style.backgroundColor;
}

function isAllowedHighlightStyle(value: string): boolean {
  const match = value.match(/background-color:\s*([^;]+)/i);
  if (!match) return false;

  const selectedColor = normalizeCssColor(match[1].trim());
  return allowedHighlightColors.some((color) => normalizeCssColor(color) === selectedColor);
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
    'MARK',
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
          const isSafeHighlight =
            element.tagName === 'MARK' &&
            attribute.name === 'style' &&
            isAllowedHighlightStyle(attribute.value);
          if (!isSafeLink && !isLinkTarget && !isSafeHighlight) {
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
