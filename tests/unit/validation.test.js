import { describe, expect, it } from 'vitest';
import { isProbablyValidUrl, validateMenu } from '../../src/logic.js';

describe('validation helpers', () => {
  it('accepts populated menu fixture shape', () => {
    const menu = [
      {
        titulo: 'Receitas',
        icon: 'fa-coins',
        descricao: 'Informações sobre receitas.',
        submenus: [
          {
            titulo: 'Receitas Orçamentárias',
            icon: 'fa-coins',
            descricao: 'Consulta receitas orçamentárias.',
            link: 'https://example.com',
            blank: true
          }
        ]
      }
    ];

    expect(validateMenu(menu)).toEqual({ errors: [] });
  });

  it('reports missing category and submenu fields', () => {
    const { errors } = validateMenu([
      {
        titulo: '',
        icon: '',
        descricao: '',
        submenus: [
          { titulo: '', icon: '', descricao: '', link: 'notaurl' }
        ]
      },
      {
        titulo: 'Direto',
        icon: 'fa-file',
        descricao: 'Categoria sem submenu',
        submenus: [],
        link: 'notaurl'
      }
    ]);

    expect(errors).toEqual([
      'Categoria 1 sem título.',
      'Categoria 1 sem ícone.',
      'Categoria 1 sem descrição.',
      'Categoria 1, submenu 1 sem título.',
      'Categoria 1, submenu 1 sem ícone.',
      'Categoria 1, submenu 1 sem descrição.',
      'Categoria 1, submenu 1 com link possivelmente inválido.',
      'Categoria 2 com link direto possivelmente inválido.'
    ]);
  });

  it('requires direct link when category has no submenu', () => {
    expect(validateMenu([
      {
        titulo: 'Categoria',
        icon: 'fa-circle',
        descricao: 'Descricao',
        submenus: []
      }
    ])).toEqual({ errors: ['Categoria 1 sem link direto.'] });
  });

  it('reports malformed and missing fields without throwing', () => {
    expect(validateMenu([null, {
      titulo: null,
      submenus: [null, {}]
    }])).toEqual({
      errors: [
        'Categoria 1 precisa ser um objeto.',
        'Categoria 2 sem título.',
        'Categoria 2 sem ícone.',
        'Categoria 2 sem descrição.',
        'Categoria 2, submenu 1 precisa ser um objeto.',
        'Categoria 2, submenu 2 sem título.',
        'Categoria 2, submenu 2 sem ícone.',
        'Categoria 2, submenu 2 sem descrição.',
        'Categoria 2, submenu 2 sem link.'
      ]
    });
  });

  it('checks likely URLs', () => {
    expect(isProbablyValidUrl('https://example.com')).toBe(true);
    expect(isProbablyValidUrl('mailto:contato@example.com')).toBe(true);
    expect(isProbablyValidUrl('ftp://example.com')).toBe(false);
    expect(isProbablyValidUrl('notaurl')).toBe(false);
  });
});
