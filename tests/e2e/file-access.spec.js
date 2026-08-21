import { expect, test } from '@playwright/test';

function collectConsoleErrors(page) {
  const messages = [];
  page.on('pageerror', error => messages.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('Failed to load resource')) {
      messages.push(`console: ${text}`);
    }
  });
  return messages;
}

test.describe('File System Access API direct file editing', () => {
  test('opens, edits, and saves menu.json directly via FileSystemFileHandle', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    // Install browser File System Access API mocks before loading scripts
    await page.addInitScript(() => {
      window.__fileAccessLogs = {
        writes: [],
        openCount: 0,
        saveAsCount: 0
      };

      const initialContent = JSON.stringify([
        {
          titulo: 'Categoria Direta',
          icon: 'fa-landmark',
          descricao: 'Descrição do arquivo no disco',
          submenus: [
            {
              titulo: 'Submenu 1',
              icon: 'fa-circle-dot',
              descricao: 'Item 1',
              link: 'https://timoteo.mg.gov.br'
            }
          ]
        }
      ], null, 2);

      const fakeHandle = {
        name: 'menu.json',
        kind: 'file',
        async queryPermission() {
          return 'granted';
        },
        async requestPermission() {
          return 'granted';
        },
        async getFile() {
          return new File([initialContent], 'menu.json', { type: 'application/json' });
        },
        async createWritable() {
          return {
            async write(data) {
              window.__fileAccessLogs.writes.push(String(data));
            },
            async close() {}
          };
        }
      };

      window.showOpenFilePicker = async () => {
        window.__fileAccessLogs.openCount++;
        return [fakeHandle];
      };

      window.showSaveFilePicker = async (options) => {
        window.__fileAccessLogs.saveAsCount++;
        return {
          ...fakeHandle,
          name: options.suggestedName || 'menu.json'
        };
      };
    });

    await page.goto('/');

    // 1. Initial clean state
    await expect(page.locator('#fileNameBadge')).toContainText('Base embutida');
    await expect(page.locator('#saveStateBadge')).toContainText('Autosave ativo');

    // 2. Open file with direct picker
    await page.locator('#openJsonButton').click();
    await expect(page.locator('#fileNameBadge')).toContainText('menu.json · Acesso Direto');
    await expect(page.locator('#saveStateBadge')).toContainText('Salvo no disco');
    await expect(page.locator('#treeContainer')).toContainText('Categoria Direta');

    // 3. Edit title to trigger dirty state
    await page.locator('#treeContainer [data-action="select-category"]').first().click();
    await page.locator('#titleInput').fill('Categoria Direta Modificada');
    await expect(page.locator('#saveStateBadge')).toContainText('Alterações pendentes');

    // 4. Save directly with toolbar button
    await page.locator('#saveJsonButton').click();
    await expect(page.locator('#saveStateBadge')).toContainText('Salvo no disco');

    // Verify mock received serialized write
    const writes = await page.evaluate(() => window.__fileAccessLogs.writes);
    expect(writes.length).toBe(1);
    expect(writes[0]).toContain('Categoria Direta Modificada');

    // 5. Test keyboard shortcut Ctrl+S
    await page.locator('#titleInput').fill('Categoria Direta Salva via Teclado');
    await expect(page.locator('#saveStateBadge')).toContainText('Alterações pendentes');
    await page.keyboard.press('Control+S');
    await expect(page.locator('#saveStateBadge')).toContainText('Salvo no disco');

    const updatedWrites = await page.evaluate(() => window.__fileAccessLogs.writes);
    expect(updatedWrites.length).toBe(2);
    expect(updatedWrites[1]).toContain('Categoria Direta Salva via Teclado');

    // 6. Test "Salvar como"
    await page.locator('#saveAsJsonButton').click();
    await expect(page.locator('#fileNameBadge')).toContainText('menu.json · Acesso Direto');
    await expect(page.locator('#saveStateBadge')).toContainText('Salvo no disco');

    const saveAsCount = await page.evaluate(() => window.__fileAccessLogs.saveAsCount);
    expect(saveAsCount).toBe(1);

    expect(consoleErrors).toEqual([]);
  });
});
