/**
 * @file logic.js
 * @purpose Pure menu normalization, validation, CSV parsing, and matrix comparison helpers.
 * @dependencies Standard JavaScript APIs only.
 * @usage Imported by unit tests and available for future app-level extraction.
 */
import { extractDescriptionText, hasRenderableDescription } from './description-html.js';

const EXECUTIVE_MATRIXES = new Set([
  'COMUM',
  'COMUM EXCETO ESTATAIS',
  'COMUM EXCETO ESTATAIS INDEPENDENTES',
  'EXECUTIVO',
  'EXECUTIVO E CONSORCIOS'
]);

const MATCH_STOP_WORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e',
  'em', 'entre', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'que', 'se', 'seu',
  'sua', 'suas', 'seus', 'um', 'uma', 'divulga', 'divulgar', 'publica', 'publicar',
  'possui', 'apresenta', 'permite', 'possibilita', 'informacao', 'informacoes',
  'dados', 'portal', 'site', 'poder', 'orgao'
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMenu(input, fallbackIcon = 'fa-circle-dot') {
  if (!Array.isArray(input)) {
    throw new Error('Arquivo precisa conter um array de categorias.');
  }
  return input.map((category, index) => normalizeCategory(category, index, fallbackIcon));
}

function normalizeCategory(category, index, fallbackIcon = 'fa-circle-dot') {
  const safeCategory = isPlainObject(category) ? category : {};
  const submenus = Array.isArray(safeCategory.submenus) ? safeCategory.submenus : [];
  return {
    ...safeCategory,
    titulo: String(safeCategory.titulo ?? `Categoria ${index + 1}`),
    icon: String(safeCategory.icon ?? fallbackIcon),
    descricao: String(safeCategory.descricao ?? ''),
    link: String(safeCategory.link ?? ''),
    blank: Boolean(safeCategory.blank),
    iframe: Boolean(safeCategory.iframe),
    visible: safeCategory.visible === undefined ? true : Boolean(safeCategory.visible),
    submenus: submenus.map((submenu, subIndex) => normalizeSubmenu(submenu, subIndex, fallbackIcon))
  };
}

function normalizeSubmenu(submenu, index, fallbackIcon = 'fa-circle-dot') {
  const safeSubmenu = isPlainObject(submenu) ? submenu : {};
  const normalizedSubmenu = {
    ...safeSubmenu,
    titulo: String(safeSubmenu.titulo ?? `Item ${index + 1}`),
    icon: String(safeSubmenu.icon ?? fallbackIcon),
    descricao: String(safeSubmenu.descricao ?? ''),
    link: String(safeSubmenu.link ?? ''),
    blank: Boolean(safeSubmenu.blank),
    iframe: Boolean(safeSubmenu.iframe),
    visible: safeSubmenu.visible === undefined ? true : Boolean(safeSubmenu.visible)
  };
  if (Array.isArray(safeSubmenu.submenus)) {
    normalizedSubmenu.submenus = safeSubmenu.submenus.map((child, childIndex) => normalizeSubmenu(child, childIndex, fallbackIcon));
  }
  return normalizedSubmenu;
}

function normalizeComparisonText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ /g, ' ')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeCriterionId(value) {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .replace(/\s+/g, '');
}

function criterionKey(matrix, id) {
  return `${normalizeComparisonText(matrix)}|${normalizeCriterionId(id)}`;
}

function parseCriterionReference(value) {
  const parts = String(value ?? '').split('|').map(part => part.trim()).filter(Boolean);
  const matrix = parts[0] || '';
  const id = normalizeCriterionId(parts.at(-1) || '');
  return { matrix, id, key: matrix && id ? criterionKey(matrix, id) : '' };
}

function significantTokens(value) {
  return new Set(
    normalizeComparisonText(value)
      .split(' ')
      .filter(token => token.length >= 3 && !MATCH_STOP_WORDS.has(token))
  );
}

function diceSimilarity(left, right) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach(token => {
    if (right.has(token)) overlap += 1;
  });
  return (2 * overlap) / (left.size + right.size);
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += character;
  }

  if (quoted) throw new Error('campo entre aspas não foi fechado.');
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^﻿/, '');
  return rows;
}

function parseMatrixCsv(csvText) {
  const rows = parseDelimitedRows(csvText, ';');
  if (!rows.length) throw new Error('arquivo vazio.');
  const headers = rows[0].map(normalizeComparisonText);
  const columns = {
    matrix: headers.findIndex(header => header === 'matriz'),
    dimension: headers.findIndex(header => header === 'dimensao'),
    id: headers.findIndex(header => header === 'id'),
    criterion: headers.findIndex(header => header === 'criterio'),
    classification: headers.findIndex(header => header.startsWith('classificacao'))
  };
  if (Object.values(columns).some(index => index < 0)) {
    throw new Error('colunas MATRIZ, DIMENSÃO, ID, CRITÉRIO e CLASSIFICAÇÃO são obrigatórias.');
  }

  return rows.slice(1).map(row => ({
    matrix: String(row[columns.matrix] ?? '').trim(),
    dimension: String(row[columns.dimension] ?? '').trim(),
    id: normalizeCriterionId(row[columns.id]),
    criterion: String(row[columns.criterion] ?? '').trim().replace(/\s+/g, ' '),
    classification: String(row[columns.classification] ?? '').trim()
  })).filter(item => item.matrix && item.dimension && item.id && item.criterion);
}

function validateMenu(menu) {
  const errors = [];
  if (!Array.isArray(menu)) {
    return { errors: ['Raiz do JSON precisa ser um array.'] };
  }
  menu.forEach((category, categoryIndex) => validateCategory(category, categoryIndex, errors));
  return { errors };
}

function validateCategory(category, categoryIndex, errors) {
  const label = `Categoria ${categoryIndex + 1}`;
  if (!category.titulo.trim()) errors.push(`${label} sem título.`);
  if (!category.icon.trim()) errors.push(`${label} sem ícone.`);
  if (!extractDescriptionText(category.descricao)) errors.push(`${label} sem descrição.`);
  if (!Array.isArray(category.submenus)) {
    errors.push(`${label} precisa conter submenus como array.`);
    return;
  }
  if (!category.submenus.length) {
    const categoryLink = String(category.link ?? '').trim();
    if (!categoryLink) errors.push(`${label} sem link direto.`);
    if (categoryLink && !isProbablyValidUrl(categoryLink)) errors.push(`${label} com link direto possivelmente inválido.`);
    return;
  }
  category.submenus.forEach((submenu, submenuIndex) => validateSubmenu(submenu, categoryIndex, submenuIndex, errors));
}

function validateSubmenu(submenu, categoryIndex, submenuIndex, errors) {
  const label = `Categoria ${categoryIndex + 1}, submenu ${submenuIndex + 1}`;
  if (!submenu.titulo.trim()) errors.push(`${label} sem título.`);
  if (!submenu.icon.trim()) errors.push(`${label} sem ícone.`);
  if (!extractDescriptionText(submenu.descricao)) errors.push(`${label} sem descrição.`);
  const submenuLink = String(submenu.link ?? '').trim();
  if (!submenuLink) errors.push(`${label} sem link.`);
  if (submenuLink && !isProbablyValidUrl(submenuLink)) errors.push(`${label} com link possivelmente inválido.`);
}

function isProbablyValidUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function flattenMenuNodes(menu) {
  const nodes = [];
  function visit(item, parentPath, indexPath) {
    if (!isPlainObject(item)) return;
    const title = String(item.titulo ?? '').trim();
    const path = [...parentPath, title || 'Sem título'];
    nodes.push({
      item,
      nodeId: indexPath.join('.'),
      title,
      description: extractDescriptionText(item.descricao),
      path: path.join(' / '),
      criterionReferences: menuItemCriterionReferences(item)
    });
    if (Array.isArray(item.submenus)) {
      item.submenus.forEach((child, childIndex) => visit(child, path, [...indexPath, childIndex]));
    }
  }
  menu.forEach((item, index) => visit(item, [], [index]));
  return nodes;
}

function menuItemCriterionReferences(item) {
  const references = [];
  if (typeof item.criterio_matriz === 'string' && item.criterio_matriz.trim()) {
    references.push(item.criterio_matriz.trim());
  }
  if (Array.isArray(item.criterios_matriz)) {
    item.criterios_matriz.forEach(reference => {
      if (typeof reference === 'string' && reference.trim()) references.push(reference.trim());
    });
  }
  return [...new Set(references)];
}

function buildExactCriterionMatches(menuNodes) {
  const byKey = new Map();
  menuNodes.forEach(node => {
    node.criterionReferences.forEach(value => {
      const reference = parseCriterionReference(value);
      if (!reference.id || !reference.key) return;
      byKey.set(reference.key, node);
    });
  });
  return { byKey };
}

function criterionNodeScore(criterion, node) {
  const criterionTokens = significantTokens(criterion.criterion);
  const nodeTokens = significantTokens(`${node.title} ${node.description}`);
  const dimensionTokens = significantTokens(criterion.dimension);
  const pathTokens = significantTokens(node.path);
  const contentScore = diceSimilarity(criterionTokens, nodeTokens);
  const dimensionScore = diceSimilarity(dimensionTokens, pathTokens);
  const normalizedCriterion = normalizeComparisonText(criterion.criterion);
  const normalizedTitle = normalizeComparisonText(node.title);
  const titleContained = normalizedTitle.length >= 6 && normalizedCriterion.includes(normalizedTitle) ? 0.78 : 0;
  return Math.max(titleContained, (contentScore * 0.76) + (dimensionScore * 0.24));
}

function compareCriterion(criterion, menuNodes, exactMatches) {
  const key = criterionKey(criterion.matrix, criterion.id);
  const exactNode = exactMatches.byKey.get(key);
  if (exactNode) {
    return { criterion, status: 'covered', match: exactNode, score: 1 };
  }

  let bestMatch = null;
  let bestScore = 0;
  menuNodes.forEach(node => {
    const score = criterionNodeScore(criterion, node);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = node;
    }
  });
  return {
    criterion,
    status: bestScore >= 0.44 ? 'possible' : 'gap',
    match: bestMatch,
    score: bestScore
  };
}

function compareMatrixToMenu(criteria, menu) {
  const menuNodes = flattenMenuNodes(menu);
  const exactMatches = buildExactCriterionMatches(menuNodes);
  const results = criteria.map(criterion => compareCriterion(criterion, menuNodes, exactMatches));
  const counts = results.reduce((total, result) => {
    total[result.status] += 1;
    return total;
  }, { gap: 0, possible: 0, covered: 0 });
  return { results, counts };
}

function criteriaForScope(criteria, scope) {
  if (scope === 'all') return criteria;
  if (scope.startsWith('matrix:')) {
    const selectedMatrix = scope.slice(7);
    return criteria.filter(item => item.matrix === selectedMatrix);
  }
  return criteria.filter(item => EXECUTIVE_MATRIXES.has(normalizeComparisonText(item.matrix).toUpperCase()));
}

export {
  EXECUTIVE_MATRIXES,
  MATCH_STOP_WORDS,
  buildExactCriterionMatches,
  compareCriterion,
  compareMatrixToMenu,
  criterionKey,
  criterionNodeScore,
  criteriaForScope,
  diceSimilarity,
  flattenMenuNodes,
  hasRenderableDescription,
  isPlainObject,
  isProbablyValidUrl,
  menuItemCriterionReferences,
  normalizeCategory,
  normalizeComparisonText,
  normalizeCriterionId,
  normalizeMenu,
  normalizeSubmenu,
  parseCriterionReference,
  parseDelimitedRows,
  parseMatrixCsv,
  significantTokens,
  validateCategory,
  validateMenu,
  validateSubmenu
};
