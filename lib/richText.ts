const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
]);

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

/** Sanitiza o HTML produzido pelo editor, mantendo somente formatação textual. */
export const sanitizeRichText = (value: string): string => {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return escapeHtml(value);

  const documentNode = new DOMParser().parseFromString(`<div>${value}</div>`, 'text/html');
  const root = documentNode.body.firstElementChild;
  if (!root) return '';

  const cleanNode = (node: Node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as HTMLElement;
      cleanNode(element);
      if (!ALLOWED_TAGS.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }
      Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
    });
  };

  cleanNode(root);
  return root.innerHTML.trim();
};

export const richTextToPlainText = (value: string): string => {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return value.replace(/<[^>]*>/g, ' ');
  const documentNode = new DOMParser().parseFromString(value, 'text/html');
  return (documentNode.body.textContent || '').replace(/\u00a0/g, ' ').trim();
};

export const richTextHasContent = (value: string): boolean => richTextToPlainText(value).length > 0;
