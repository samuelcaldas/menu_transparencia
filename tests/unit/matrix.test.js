import { describe, expect, it } from 'vitest';
import { compareMatrixToMenu, criteriaForScope, parseMatrixCsv } from '../../src/logic.js';

const menu = [
  {
    titulo: 'Receitas',
    icon: 'fa-coins',
    descricao: 'Receitas arrecadadas.',
    submenus: [
      {
        titulo: 'Receitas Orçamentárias',
        icon: 'fa-coins',
        descricao: 'Consulta receitas orçamentárias.',
        link: 'https://example.com/receitas',
        blank: true,
        criterio_matriz: 'COMUM | Informações Prioritárias | 1.4'
      }
    ]
  },
  {
    titulo: 'Despesas',
    icon: 'fa-money-bill',
    descricao: 'Detalhamento das despesas.',
    submenus: []
  }
];

const csv = [
  'MATRIZ;DIMENSÃO;ID;CRITÉRIO;CLASSIFICAÇÃO',
  'COMUM;Informações Prioritárias;1.4;Possui ferramenta de pesquisa?;Obrigatória',
  'EXECUTIVO;Receita;3.2;Divulga receitas arrecadadas?;Essencial',
  'ESTATAIS;Controle;4.4;Publica atas de reunião?;Recomendada'
].join('\n');

describe('matrix helpers', () => {
  it('parses matrix CSV rows', () => {
    expect(parseMatrixCsv(csv)).toEqual([
      {
        matrix: 'COMUM',
        dimension: 'Informações Prioritárias',
        id: '1.4',
        criterion: 'Possui ferramenta de pesquisa?',
        classification: 'Obrigatória'
      },
      {
        matrix: 'EXECUTIVO',
        dimension: 'Receita',
        id: '3.2',
        criterion: 'Divulga receitas arrecadadas?',
        classification: 'Essencial'
      },
      {
        matrix: 'ESTATAIS',
        dimension: 'Controle',
        id: '4.4',
        criterion: 'Publica atas de reunião?',
        classification: 'Recomendada'
      }
    ]);
  });

  it('compares criteria to menu nodes', () => {
    const criteria = parseMatrixCsv(csv);
    const comparison = compareMatrixToMenu(criteria, menu);

    expect(comparison.counts).toEqual({ gap: 1, possible: 1, covered: 1 });
    expect(comparison.results.map(result => result.status)).toEqual(['covered', 'possible', 'gap']);
    expect(comparison.results[0].match.nodeId).toBe('0.0');
    expect(comparison.results[1].match.title).toBe('Receitas');
    expect(comparison.results[2].match).toBeNull();
  });

  it('filters executive scope correctly', () => {
    const criteria = parseMatrixCsv(csv);

    expect(criteriaForScope(criteria, 'executive')).toEqual([
      criteria[0],
      criteria[1]
    ]);
    expect(criteriaForScope(criteria, 'all')).toHaveLength(3);
    expect(criteriaForScope(criteria, 'matrix:ESTATAIS')).toEqual([criteria[2]]);
  });

  it('rejects malformed matrix CSV', () => {
    expect(() => parseMatrixCsv('foo;bar')).toThrow('colunas MATRIZ, DIMENSÃO, ID, CRITÉRIO e CLASSIFICAÇÃO são obrigatórias.');
    expect(() => parseMatrixCsv('')).toThrow('arquivo vazio.');
  });
});
