/**
 * @file description-html.js
 * @purpose Sanitize and format simple HTML used in menu descriptions.
 * @dependencies Standard JavaScript APIs only.
 * @usage Imported by app rendering and unit tests.
 */
const ALLOWED_TAGS = new Set(['strong', 'em', 'u', 'br', 'ul', 'ol', 'li', 'a']);
const BLOCKED_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math']);
const TAG_ALIASES = new Map([
  ['b', 'strong'],
  ['i', 'em']
]);
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function normalizeTagName(value) {
  const name = String(value ?? '').toLowerCase();
  return TAG_ALIASES.get(name) || name;
}

function safeDescriptionHref(value) {
  const href = String(value ?? '').trim();
  if (!href) return '';
  try {
    const parsedUrl = new URL(href);
    return SAFE_LINK_PROTOCOLS.has(parsedUrl.protocol) ? href : '';
  } catch {
    return '';
  }
}

function extractHref(attributes) {
  const match = String(attributes ?? '').match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/i);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function sanitizeDescriptionHtml(value) {
  const source = String(value ?? '');
  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*)>/g;
  const openTags = [];
  let output = '';
  let cursor = 0;
  let blockedTag = '';
  let blockedDepth = 0;
  let match;

  while ((match = tagPattern.exec(source))) {
    const [token, closingSlash, rawName, attributes] = match;
    const rawTagName = String(rawName).toLowerCase();
    const tagName = normalizeTagName(rawTagName);
    const isClosing = Boolean(closingSlash);

    if (!blockedTag) {
      output += escapeHtml(source.slice(cursor, match.index));
    }
    cursor = match.index + token.length;

    if (blockedTag) {
      if (rawTagName === blockedTag) {
        blockedDepth += isClosing ? -1 : 1;
        if (blockedDepth <= 0) {
          blockedTag = '';
          blockedDepth = 0;
        }
      }
      continue;
    }

    if (BLOCKED_CONTENT_TAGS.has(rawTagName)) {
      if (!isClosing) {
        blockedTag = rawTagName;
        blockedDepth = 1;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      continue;
    }

    if (tagName === 'br') {
      if (!isClosing) output += '<br>';
      continue;
    }

    if (isClosing) {
      const lastTag = openTags.at(-1);
      if (lastTag === tagName) {
        openTags.pop();
        output += `</${tagName}>`;
      }
      continue;
    }

    if (tagName === 'a') {
      const href = safeDescriptionHref(extractHref(attributes));
      if (!href) continue;
      openTags.push(tagName);
      output += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
      continue;
    }

    openTags.push(tagName);
    output += `<${tagName}>`;
  }

  if (!blockedTag) {
    output += escapeHtml(source.slice(cursor));
  }

  while (openTags.length) {
    output += `</${openTags.pop()}>`;
  }

  return output;
}

function extractDescriptionText(value) {
  const source = String(value ?? '');
  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*)>/g;
  let output = '';
  let cursor = 0;
  let blockedTag = '';
  let blockedDepth = 0;
  let match;

  while ((match = tagPattern.exec(source))) {
    const [token, closingSlash, rawName] = match;
    const rawTagName = String(rawName).toLowerCase();
    const tagName = normalizeTagName(rawTagName);
    const isClosing = Boolean(closingSlash);

    if (!blockedTag) {
      output += source.slice(cursor, match.index);
    }
    cursor = match.index + token.length;

    if (blockedTag) {
      if (rawTagName === blockedTag) {
        blockedDepth += isClosing ? -1 : 1;
        if (blockedDepth <= 0) {
          blockedTag = '';
          blockedDepth = 0;
        }
      }
      continue;
    }

    if (BLOCKED_CONTENT_TAGS.has(rawTagName)) {
      if (!isClosing) {
        blockedTag = rawTagName;
        blockedDepth = 1;
      }
      continue;
    }

    if (['br', 'li', 'p', 'ul', 'ol'].includes(tagName)) {
      output += ' ';
    }
  }

  if (!blockedTag) {
    output += source.slice(cursor);
  }

  return decodeHtmlEntities(output).replace(/\s+/g, ' ').trim();
}

function hasRenderableDescription(value) {
  return Boolean(extractDescriptionText(value));
}

function formatSelection(value, selectionStart, selectionEnd, openTag, closeTag, placeholder) {
  const source = String(value ?? '');
  const start = Math.max(0, Number(selectionStart) || 0);
  const end = Math.max(start, Number(selectionEnd) || start);
  const selectedText = source.slice(start, end) || placeholder;
  const inserted = `${openTag}${selectedText}${closeTag}`;
  const nextStart = start + openTag.length;
  const nextEnd = nextStart + selectedText.length;
  return {
    value: source.slice(0, start) + inserted + source.slice(end),
    selectionStart: nextStart,
    selectionEnd: nextEnd
  };
}

function listSelection(value, selectionStart, selectionEnd, tagName) {
  const source = String(value ?? '');
  const start = Math.max(0, Number(selectionStart) || 0);
  const end = Math.max(start, Number(selectionEnd) || start);
  const selectedText = source.slice(start, end) || 'Item da lista';
  const items = selectedText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const body = (items.length ? items : ['Item da lista']).map(item => `  <li>${escapeHtml(item)}</li>`).join('\n');
  const inserted = `<${tagName}>\n${body}\n</${tagName}>`;
  return {
    value: source.slice(0, start) + inserted + source.slice(end),
    selectionStart: start,
    selectionEnd: start + inserted.length
  };
}

function stripDescriptionTags(value) {
  return extractDescriptionText(value);
}

function applyDescriptionFormat(value, selectionStart, selectionEnd, command, extra = {}) {
  if (command === 'bold') return formatSelection(value, selectionStart, selectionEnd, '<strong>', '</strong>', 'texto em destaque');
  if (command === 'italic') return formatSelection(value, selectionStart, selectionEnd, '<em>', '</em>', 'texto enfatizado');
  if (command === 'underline') return formatSelection(value, selectionStart, selectionEnd, '<u>', '</u>', 'texto sublinhado');
  if (command === 'line-break') {
    const source = String(value ?? '');
    const start = Math.max(0, Number(selectionStart) || 0);
    const end = Math.max(start, Number(selectionEnd) || start);
    const inserted = '<br>';
    return {
      value: source.slice(0, start) + inserted + source.slice(end),
      selectionStart: start + inserted.length,
      selectionEnd: start + inserted.length
    };
  }
  if (command === 'unordered-list') return listSelection(value, selectionStart, selectionEnd, 'ul');
  if (command === 'ordered-list') return listSelection(value, selectionStart, selectionEnd, 'ol');
  if (command === 'link') {
    const href = safeDescriptionHref(extra.href);
    if (!href) return { value: String(value ?? ''), selectionStart, selectionEnd };
    return formatSelection(value, selectionStart, selectionEnd, `<a href="${escapeHtml(href)}">`, '</a>', 'link');
  }
  if (command === 'clear') {
    const source = String(value ?? '');
    const start = Math.max(0, Number(selectionStart) || 0);
    const end = Math.max(start, Number(selectionEnd) || start);
    const selectedText = source.slice(start, end);
    if (!selectedText) {
      const plainText = stripDescriptionTags(source);
      return { value: plainText, selectionStart: plainText.length, selectionEnd: plainText.length };
    }
    const plainText = stripDescriptionTags(selectedText);
    return {
      value: source.slice(0, start) + plainText + source.slice(end),
      selectionStart: start,
      selectionEnd: start + plainText.length
    };
  }
  return { value: String(value ?? ''), selectionStart, selectionEnd };
}

export {
  applyDescriptionFormat,
  extractDescriptionText,
  hasRenderableDescription,
  safeDescriptionHref,
  sanitizeDescriptionHtml
};
