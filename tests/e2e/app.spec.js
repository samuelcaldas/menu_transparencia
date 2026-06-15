import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const menuOriginal = path.join(root, 'menu_original.json');
const menuPopulado = path.join(root, 'menu_populado.json');
const matrixCsv = path.join(root, 'Matriz de Critérios 2026 (Final).CSV');

function collectConsoleErrors(page) {
  const messages = [];
  page.on('pageerror', error => messages.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('Failed to load resource')) messages.push(`console: ${text}`);
  });
  return messages;
}

test('app smoke flow', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto('/');

  await expect(page).toHaveTitle(/Editor de menu JSON/);
  await expect(page.getByRole('heading', { name: 'Editor de menu cívico' })).toBeVisible();
  await expect(page.locator('#categoryCountMetric')).not.toHaveText('0');
  await expect(page.getByText('Árvore do menu')).toBeVisible();
  await expect(page.getByText('Item selecionado')).toBeVisible();
  await expect(page.getByText('Preview e JSON')).toBeVisible();
  await expect(page.locator('#treeContainer [data-action="select-category"]').first()).toBeVisible();
  await page.locator('#expandAllButton').click();
  await expect.poll(async () => page.locator('#treeContainer').evaluate(element => ({
    scrollable: element.scrollHeight > element.clientHeight,
    overflowY: getComputedStyle(element).overflowY
  }))).toEqual({ scrollable: true, overflowY: 'auto' });

  await page.locator('#treeContainer [data-action="select-category"]').first().click();
  await expect(page.locator('#editorContainer')).toContainText('Categoria');

  await page.locator('[data-tab="json"]').click();
  await expect(page.locator('#rawJsonTextarea')).toContainText('Receitas');
  expect(await page.locator('#rawJsonTextarea').evaluate(element => element.clientHeight)).toBeGreaterThan(340);
  await page.getByRole('button', { name: 'Formatar' }).click();
  await page.getByRole('button', { name: 'Aplicar JSON' }).click();
  await expect(page.getByText('JSON aplicado.')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('renders simple HTML descriptions safely', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto('/');
  await page.locator('#treeContainer [data-action="select-category"]').first().click();

  const description = '<strong>Texto forte</strong> <a href="javascript:alert(1)" onclick="bad()">ruim</a> <a href="https://example.com">bom</a>';
  await page.locator('#descriptionInput').fill(description);
  await expect(page.locator('#editorContainer .stamp-description strong')).toContainText('Texto forte');
  await expect(page.locator('#editorContainer .stamp-description a[href="https://example.com"]')).toContainText('bom');

  await page.locator('[data-tab="preview"]').click();
  await expect(page.locator('#previewPanel strong')).toContainText('Texto forte');
  await expect(page.locator('#previewPanel a[href="https://example.com"]')).toContainText('bom');
  await expect(page.locator('#previewPanel a[href="https://example.com"]')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('#previewPanel a[href^="javascript"]')).toHaveCount(0);

  await page.locator('[data-tab="json"]').click();
  await expect(page.locator('#rawJsonTextarea')).toContainText('<strong>Texto forte</strong>');
  await expect(page.locator('#rawJsonTextarea')).toContainText('javascript:alert(1)');

  await page.locator('[data-tab="preview"]').click();
  await page.locator('#treeContainer [data-action="select-category"]').first().click();
  await page.locator('#descriptionInput').fill('Texto alvo');
  await page.locator('#descriptionInput').evaluate(element => element.setSelectionRange(6, 10));
  await page.getByRole('button', { name: 'Negrito' }).click();
  await expect(page.locator('#descriptionInput')).toHaveValue('Texto <strong>alvo</strong>');
  await expect(page.locator('#editorContainer .stamp-description strong')).toContainText('alvo');

  await page.getByRole('button', { name: /^Categoria$/ }).click();
  await page.locator('#titleInput').fill('Link inseguro');
  await page.locator('#descriptionInput').fill('Descrição segura');
  await page.locator('#categoryLinkInput').fill('javascript:alert(1)');
  await page.locator('[data-tab="preview"]').click();
  await expect(page.locator('#previewPanel a[href^="javascript"]')).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('edits iframe and visible metadata', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto('/');

  const firstCategory = page.locator('#treeContainer [data-action="select-category"]').first();
  const categoryTitle = (await firstCategory.locator('.tree-row-label').textContent())?.trim() || '';
  await firstCategory.click();

  await expect(page.getByLabel('Visível no preview')).toBeChecked();
  await page.getByLabel('Visível no preview').setChecked(false);
  await page.getByLabel('Abrir em iframe').setChecked(true);

  await page.locator('[data-tab="preview"]').click();
  await expect(page.locator('#previewPanel')).not.toContainText(categoryTitle);

  await page.locator('[data-tab="json"]').click();
  await expect(page.locator('#rawJsonTextarea')).toContainText('"visible": false');
  await expect(page.locator('#rawJsonTextarea')).toContainText('"iframe": true');
  await expect(page.locator('#treeContainer')).toContainText(categoryTitle);

  expect(consoleErrors).toEqual([]);
});

test('loads online icon library from consolidated picker', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.route('https://data.jsdelivr.com/v1/packages/npm/@fortawesome/free-solid-svg-icons', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ tags: { latest: '5.15.4' } })
  }));
  await page.route('https://cdn.jsdelivr.net/npm/@fortawesome/free-solid-svg-icons@5.15.4/index.es.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: "var faHouse = { iconName: 'house' }; var faBuilding = { iconName: 'building' };"
  }));
  await page.goto('/');
  await page.locator('#treeContainer [data-action="select-category"]').first().click();

  await expect(page.locator('details.icon-library')).not.toHaveAttribute('open', '');
  await page.locator('.icon-library summary').click();
  await page.getByRole('button', { name: /Pesquisar biblioteca completa/ }).click();
  await page.getByPlaceholder('Buscar ícone').fill('building');
  await page.locator('#iconPickerGrid [data-picker-icon="fa-building"]').click();
  await expect(page.locator('#iconPickerDialog')).not.toBeVisible();

  await page.locator('.icon-library summary').click();
  await page.getByRole('button', { name: /Pesquisar biblioteca completa/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.locator('#iconPickerDialog')).not.toBeVisible();

  await page.getByRole('button', { name: /Pesquisar biblioteca completa/ }).click();
  await page.mouse.click(10, 10);
  await expect(page.locator('#iconPickerDialog')).not.toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('loads JSON and matrix fixtures without crashing', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto('/');

  await page.locator('#jsonFileInput').setInputFiles(menuPopulado);
  await expect(page.getByText('menu_populado.json')).toBeVisible();
  await expect(page.getByText('Receitas').first()).toBeVisible();

  await page.locator('#csvFileInput').setInputFiles(matrixCsv);
  await expect(page.getByText('Matriz de Critérios 2026 (Final).CSV')).toBeVisible();
  await expect(page.locator('[data-tab="gaps"]')).toBeVisible();
  await expect(page.getByText('Relatório CSV')).toBeVisible();

  await page.locator('#jsonFileInput').setInputFiles(menuOriginal);
  await expect(page.getByText('menu_original.json')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('supports editor add and matrix interactions', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto('/');

  await page.getByRole('button', { name: /^Categoria$/ }).click();
  await expect(page.locator('#editorContainer')).toContainText('Nova categoria');

  await page.locator('#csvFileInput').setInputFiles(matrixCsv);
  await page.locator('[data-tab="gaps"]').click();
  await expect(page.locator('#gapsPanel')).toBeVisible();
  await expect(page.getByRole('button', { name: /Marcar visíveis/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Relacionar marcados/ })).toBeVisible();

  await page.getByLabel('Escopo da matriz').selectOption('all');
  await page.getByLabel('Status da comparação').selectOption('all');
  await page.getByPlaceholder('Filtrar por ID, dimensão ou critério').fill('1.1');
  await expect(page.locator('#gapsPanel')).toContainText('1.1');

  expect(consoleErrors).toEqual([]);
});
