import { describe, expect, it } from 'vitest';
import {
  applyDescriptionFormat,
  extractDescriptionText,
  hasRenderableDescription,
  sanitizeDescriptionHtml
} from '../../src/description-html.js';

describe('description html helpers', () => {
  it('allows simple formatting tags and safe links', () => {
    expect(sanitizeDescriptionHtml('<strong>Bold</strong> <em>Ital</em> <u>Under</u><br><ul><li>Item</li></ul>'))
      .toBe('<strong>Bold</strong> <em>Ital</em> <u>Under</u><br><ul><li>Item</li></ul>');
    expect(sanitizeDescriptionHtml('<a href="https://example.com" onclick="bad()">Site</a>'))
      .toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Site</a>');
  });

  it('strips unsafe tags, attributes, and link protocols', () => {
    expect(sanitizeDescriptionHtml('<script>alert(1)</script><strong onclick="bad()">Ok</strong><img src=x onerror=bad()>'))
      .toBe('<strong>Ok</strong>');
    expect(sanitizeDescriptionHtml('<a href="javascript:alert(1)">bad</a><a href="mailto:test@example.com">mail</a>'))
      .toBe('bad<a href="mailto:test@example.com" target="_blank" rel="noopener noreferrer">mail</a>');
  });

  it('extracts visible text for validation and matching', () => {
    expect(extractDescriptionText('<strong>Receitas</strong><br><script>alert(1)</script><ul><li>Orçamentárias</li></ul>'))
      .toBe('Receitas Orçamentárias');
    expect(hasRenderableDescription('<strong></strong><br>')).toBe(false);
  });

  it('formats selected description text', () => {
    expect(applyDescriptionFormat('Texto alvo', 6, 10, 'bold')).toEqual({
      value: 'Texto <strong>alvo</strong>',
      selectionStart: 14,
      selectionEnd: 18
    });
    expect(applyDescriptionFormat('Linha 1\nLinha 2', 0, 15, 'unordered-list').value)
      .toBe('<ul>\n  <li>Linha 1</li>\n  <li>Linha 2</li>\n</ul>');
  });
});
