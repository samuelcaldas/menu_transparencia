import { describe, expect, it } from 'vitest';
import {
  criterionKey,
  normalizeComparisonText,
  normalizeCriterionId,
  normalizeMenu,
  normalizeSubmenu,
  parseCriterionReference,
  parseDelimitedRows
} from '../../src/logic.js';

describe('normalize helpers', () => {
  it('normalizes menu shape with defaults', () => {
    const menu = normalizeMenu([
      {
        titulo: '  Receita  ',
        submenus: [
          { titulo: '  Item 1  ', link: 'https://example.com', blank: 1 },
          null
        ]
      },
      undefined
    ]);

    expect(menu).toEqual([
      {
        titulo: '  Receita  ',
        icon: 'fa-circle-dot',
        descricao: '',
        link: '',
        blank: false,
        submenus: [
          {
            titulo: '  Item 1  ',
            icon: 'fa-circle-dot',
            descricao: '',
            link: 'https://example.com',
            blank: true
          },
          {
            titulo: 'Item 2',
            icon: 'fa-circle-dot',
            descricao: '',
            link: '',
            blank: false
          }
        ]
      },
      {
        titulo: 'Categoria 2',
        icon: 'fa-circle-dot',
        descricao: '',
        link: '',
        blank: false,
        submenus: []
      }
    ]);
  });

  it('keeps nested submenu branches', () => {
    const submenu = normalizeSubmenu({ titulo: 10, submenus: [{ link: 123 }] }, 2);
    expect(submenu).toMatchObject({
      titulo: '10',
      icon: 'fa-circle-dot',
      descricao: '',
      link: '',
      blank: false,
      submenus: [{ titulo: 'Item 1', link: '123', blank: false }]
    });
  });

  it('rejects non-array root', () => {
    expect(() => normalizeMenu({})).toThrow('Arquivo precisa conter um array de categorias.');
  });

  it('normalizes comparison text and IDs', () => {
    expect(normalizeComparisonText('  Órgão — Público  ')).toBe('orgao publico');
    expect(normalizeCriterionId(' 1.2. ')).toBe('1.2');
    expect(criterionKey('COMUM (EXCETO ESTATAIS INDEPENDENTES)', ' 4.1 ')).toBe('comum exceto estatais independentes|4.1');
  });

  it('parses criterion references', () => {
    expect(parseCriterionReference('COMUM | Receita | 1.4')).toEqual({
      matrix: 'COMUM',
      id: '1.4',
      key: 'comum|1.4'
    });
    expect(parseCriterionReference('')).toEqual({ matrix: '', id: '', key: '' });
  });

  it('parses quoted rows and strips BOM', () => {
    const rows = parseDelimitedRows('﻿A;B\n"C;D";"E""F"', ';');
    expect(rows).toEqual([
      ['A', 'B'],
      ['C;D', 'E"F']
    ]);
  });
});
