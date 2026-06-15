/**
 * @file app.js
 * @purpose Boot and run the menu JSON editor application after the static shell loads.
 * @dependencies Browser DOM APIs, localStorage, File API, Font Awesome npm CDN metadata, embedded menu JSON.
 * @usage Imported once by src/main.js.
 */
import embeddedMenu from './data/embedded-menu.json';

const STORAGE_KEY = 'menu-json-editor-state-v1';
const FONT_AWESOME_VERSION = '5.15.4';
const FONT_AWESOME_SOLID_PACKAGE = '@fortawesome/free-solid-svg-icons';
      const FALLBACK_ICON = 'fa-circle-dot';
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
      const ICON_LIBRARY = [
        'fa-coins', 'fa-money-bill', 'fa-building', 'fa-chart-bar', 'fa-gavel',
        'fa-shopping-cart', 'fa-file-contract', 'fa-users', 'fa-hard-hat', 'fa-hospital',
        'fa-file-alt', 'fa-handshake', 'fa-book', 'fa-id-card', 'fa-industry',
        'fa-cog', 'fa-house-chimney', 'fa-envelope', 'fa-phone', 'fa-car',
        'fa-school', 'fa-warehouse', 'fa-city', 'fa-flag', 'fa-map-marker-alt',
        'fa-scale-balanced', 'fa-landmark', 'fa-magnifying-glass-chart', 'fa-file-invoice-dollar',
        'fa-seedling', 'fa-shield-halved', 'fa-person-digging', 'fa-briefcase', 'fa-calendar-days'
      ];

      let faFreeSolid = null;

      const elements = {
        root: document.getElementById('applicationRoot'),
        categoryMetric: document.getElementById('categoryCountMetric'),
        submenuMetric: document.getElementById('submenuCountMetric'),
        externalMetric: document.getElementById('externalCountMetric'),
        validationMetric: document.getElementById('validationCountMetric'),
        fileNameBadge: document.getElementById('fileNameBadge'),
        saveStateBadge: document.getElementById('saveStateBadge'),
        fileInput: document.getElementById('jsonFileInput'),
        csvFileInput: document.getElementById('csvFileInput'),
        downloadButton: document.getElementById('downloadJsonButton'),
        copyButton: document.getElementById('copyJsonButton'),
        resetButton: document.getElementById('resetJsonButton'),
        expandButton: document.getElementById('expandAllButton'),
        searchInput: document.getElementById('searchInput'),
        tree: document.getElementById('treeContainer'),
        addCategoryButton: document.getElementById('addCategoryButton'),
        addSubmenuButton: document.getElementById('addSubmenuButton'),
        editor: document.getElementById('editorContainer'),
        moveUpButton: document.getElementById('moveUpButton'),
        moveDownButton: document.getElementById('moveDownButton'),
        activeTabBadge: document.getElementById('activeTabBadge'),
        previewPanel: document.getElementById('previewPanel'),
        jsonPanel: document.getElementById('jsonPanel'),
        validatePanel: document.getElementById('validatePanel'),
        gapsPanel: document.getElementById('gapsPanel'),
        toastStack: document.getElementById('toastStack'),
        dropZone: document.getElementById('dropZone')
      };

      const state = {
        menu: [],
        initialMenu: [],
        selected: null,
        openCategories: new Set(),
        searchTerm: '',
        activeTab: 'preview',
        sourceName: 'Base embutida',
        dirty: false,
        matrix: {
          criteria: [],
          sourceName: '',
          scope: 'executive',
          status: 'gaps',
          searchTerm: '',
          selectedCriteria: new Set(),
          relationTargets: new Map()
        }
      };

      /**
       * Purpose: Escape user-controlled content before inserting HTML.
       * Parameters: value {unknown} raw value to display.
       * Returns: {string} escaped HTML-safe string.
       * Throws: none.
       */
      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
      }

      /**
       * Purpose: Create a deep clone that is safe for JSON-like menu objects.
       * Parameters: value {unknown} JSON-compatible value.
       * Returns: {unknown} cloned value.
       * Throws: SyntaxError when value cannot be serialized.
       */
      function cloneJson(value) {
        return JSON.parse(JSON.stringify(value));
      }

      /**
       * Purpose: Read embedded base menu from JSON script tag.
       * Parameters: none.
       * Returns: {Array} menu category collection.
       * Throws: SyntaxError when embedded JSON is invalid.
       */
      function readEmbeddedMenu() {
        return cloneJson(embeddedMenu);
      }

      /**
       * Purpose: Normalize loaded data into editable menu shape.
       * Parameters: input {unknown} parsed JSON data.
       * Returns: {Array} normalized categories.
       * Throws: Error when root is not an array.
       */
      function normalizeMenu(input) {
        if (!Array.isArray(input)) {
          throw new Error('Arquivo precisa conter um array de categorias.');
        }
        return input.map(normalizeCategory);
      }

      /**
       * Purpose: Normalize category object.
       * Parameters: category {unknown} category candidate; index {number} position.
       * Returns: {Object} normalized category.
       * Throws: none.
       */
      function normalizeCategory(category, index) {
        const safeCategory = isPlainObject(category) ? category : {};
        const submenus = Array.isArray(safeCategory.submenus) ? safeCategory.submenus : [];
        return {
          ...safeCategory,
          titulo: String(safeCategory.titulo ?? `Categoria ${index + 1}`),
          icon: String(safeCategory.icon ?? FALLBACK_ICON),
          descricao: String(safeCategory.descricao ?? ''),
          link: String(safeCategory.link ?? ''),
          blank: Boolean(safeCategory.blank),
          iframe: Boolean(safeCategory.iframe),
          visible: safeCategory.visible === undefined ? true : Boolean(safeCategory.visible),
          submenus: submenus.map(normalizeSubmenu)
        };
      }

      /**
       * Purpose: Normalize submenu object.
       * Parameters: submenu {unknown} submenu candidate; index {number} position.
       * Returns: {Object} normalized submenu.
       * Throws: none.
       */
      function normalizeSubmenu(submenu, index) {
        const safeSubmenu = isPlainObject(submenu) ? submenu : {};
        const normalizedSubmenu = {
          ...safeSubmenu,
          titulo: String(safeSubmenu.titulo ?? `Item ${index + 1}`),
          icon: String(safeSubmenu.icon ?? FALLBACK_ICON),
          descricao: String(safeSubmenu.descricao ?? ''),
          link: String(safeSubmenu.link ?? ''),
          blank: Boolean(safeSubmenu.blank),
          iframe: Boolean(safeSubmenu.iframe),
          visible: safeSubmenu.visible === undefined ? true : Boolean(safeSubmenu.visible)
        };
        if (Array.isArray(safeSubmenu.submenus)) {
          normalizedSubmenu.submenus = safeSubmenu.submenus.map(normalizeSubmenu);
        }
        return normalizedSubmenu;
      }

      /**
       * Purpose: Identify plain object values.
       * Parameters: value {unknown} inspected value.
       * Returns: {boolean} true for non-null object not array.
       * Throws: none.
       */
      function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
      }

      /**
       * Purpose: Check whether category is direct-link branch without submenus.
       * Parameters: category {Object} menu category.
       * Returns: {boolean} true when category has no submenus.
       * Throws: none.
       */
      function isStandaloneLinkCategory(category) {
        return isPlainObject(category)
          && Array.isArray(category.submenus)
          && category.submenus.length === 0
          && Boolean(String(category.link ?? '').trim());
      }

      /**
       * Purpose: Serialize current menu with stable formatting.
       * Parameters: none.
       * Returns: {string} formatted JSON.
       * Throws: TypeError if state cannot be serialized.
       */
      function currentJson() {
        return JSON.stringify(state.menu, null, 2);
      }

      /**
       * Purpose: Persist current state to localStorage.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function persistState() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ menu: state.menu, sourceName: state.sourceName }));
          elements.saveStateBadge.textContent = 'Autosave salvo';
        } catch (storageError) {
          elements.saveStateBadge.textContent = 'Autosave indisponível';
        }
      }

      /**
       * Purpose: Load previously saved local state.
       * Parameters: none.
       * Returns: {boolean} true when a valid stored state was restored.
       * Throws: none.
       */
      function restoreState() {
        try {
          const storedState = localStorage.getItem(STORAGE_KEY);
          if (!storedState) {
            return false;
          }
          const parsedState = JSON.parse(storedState);
          state.menu = normalizeMenu(parsedState.menu);
          state.sourceName = parsedState.sourceName || 'Autosave local';
          return true;
        } catch (restoreError) {
          localStorage.removeItem(STORAGE_KEY);
          return false;
        }
      }

      /**
       * Purpose: Initialize menu state and bind UI events.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function initializeApplication() {
        try {
          state.initialMenu = normalizeMenu(readEmbeddedMenu());
          if (!restoreState()) {
            state.menu = cloneJson(state.initialMenu);
          }
          ensureDefaultSelection();
          bindEvents();
          renderApplication();
        } catch (initializationError) {
          renderFatalError(initializationError);
        }
      }

      /**
       * Purpose: Render fatal error when application cannot start.
       * Parameters: error {Error} initialization failure.
       * Returns: {void}.
       * Throws: none.
       */
      function renderFatalError(error) {
        elements.root.innerHTML = `
          <section class="panel p-4">
            <h1 class="h4">Editor indisponível</h1>
            <p class="mb-0 text-danger">${escapeHtml(error.message)}</p>
          </section>
        `;
      }

      /**
       * Purpose: Attach browser event handlers.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function bindEvents() {
        elements.fileInput.addEventListener('change', handleFileInputChange);
        elements.csvFileInput.addEventListener('change', handleCsvFileInputChange);
        elements.downloadButton.addEventListener('click', downloadJsonFile);
        elements.copyButton.addEventListener('click', copyJsonToClipboard);
        elements.resetButton.addEventListener('click', resetToEmbeddedMenu);
        elements.expandButton.addEventListener('click', toggleAllCategories);
        elements.searchInput.addEventListener('input', handleSearchInput);
        elements.addCategoryButton.addEventListener('click', addCategory);
        elements.addSubmenuButton.addEventListener('click', addSubmenuToSelection);
        elements.moveUpButton.addEventListener('click', () => moveSelection(-1));
        elements.moveDownButton.addEventListener('click', () => moveSelection(1));
        elements.tree.addEventListener('click', handleTreeClick);
        elements.editor.addEventListener('input', handleEditorInput);
        elements.editor.addEventListener('change', handleEditorChange);
        document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', handleTabClick));
        elements.dropZone.addEventListener('dragover', handleDragOver);
        elements.dropZone.addEventListener('dragleave', handleDragLeave);
        elements.dropZone.addEventListener('drop', handleFileDrop);

        const iconDialog = document.getElementById('iconPickerDialog');
        const iconSearch = document.getElementById('iconPickerSearch');
        document.getElementById('iconPickerClose').addEventListener('click', () => iconDialog.close());
        iconDialog.addEventListener('click', e => {
          if (e.target === iconDialog) { iconDialog.close(); return; }
          const btn = e.target.closest('[data-picker-icon]');
          if (btn) {
            updateSelectedField('icon', btn.dataset.pickerIcon);
            iconDialog.close();
          }
        });
        iconSearch.addEventListener('input', () => renderIconPickerGrid(iconSearch.value));
      }

      /**
       * Purpose: Ensure one selectable item exists when menu has categories.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function ensureDefaultSelection() {
        if (state.selected && categoryExists(state.selected.categoryIndex)) {
          return;
        }
        state.selected = state.menu.length ? { categoryIndex: 0 } : null;
        if (state.selected) {
          state.openCategories.add(0);
        }
      }

      /**
       * Purpose: Check category index existence.
       * Parameters: categoryIndex {number} category position.
       * Returns: {boolean} true when index exists.
       * Throws: none.
       */
      function categoryExists(categoryIndex) {
        return Number.isInteger(categoryIndex) && categoryIndex >= 0 && categoryIndex < state.menu.length;
      }

      /**
       * Purpose: Check submenu index existence.
       * Parameters: categoryIndex {number} category position; submenuIndex {number} submenu position.
       * Returns: {boolean} true when submenu exists.
       * Throws: none.
       */
      function submenuExists(categoryIndex, submenuIndex) {
        return categoryExists(categoryIndex) && Number.isInteger(submenuIndex) && submenuIndex >= 0 && submenuIndex < state.menu[categoryIndex].submenus.length;
      }

      /**
       * Purpose: Render all application regions.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderApplication(opts) {
        renderMetrics();
        renderTree();
        if (!opts?.skipEditorRender) {
          renderEditor();
        }
        renderInspector();
        elements.fileNameBadge.textContent = state.sourceName;
        const activeCategory = categoryExists(activeCategoryIndex()) ? state.menu[activeCategoryIndex()] : null;
        elements.addSubmenuButton.disabled = !activeCategory || isStandaloneLinkCategory(activeCategory);
        elements.moveUpButton.disabled = !state.selected;
        elements.moveDownButton.disabled = !state.selected;
      }

      /**
       * Purpose: Render numeric menu summary.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderMetrics() {
        const validation = validateMenu(state.menu);
        elements.categoryMetric.textContent = String(state.menu.length);
        elements.submenuMetric.textContent = String(countSubmenus());
        elements.externalMetric.textContent = String(countExternalSubmenus());
        elements.validationMetric.textContent = String(validation.errors.length);
      }

      /**
       * Purpose: Count all submenu entries.
       * Parameters: none.
       * Returns: {number} submenu count.
       * Throws: none.
       */
      function countSubmenus() {
        return state.menu.reduce((total, category) => total + category.submenus.length, 0);
      }

      /**
       * Purpose: Count submenus configured to open in a new tab.
       * Parameters: none.
       * Returns: {number} external target count.
       * Throws: none.
       */
      function countExternalSubmenus() {
        return state.menu.reduce((total, category) => {
          const categoryCount = category.link && category.blank ? 1 : 0;
          const submenuCount = category.submenus.filter(submenu => submenu.blank).length;
          return total + categoryCount + submenuCount;
        }, 0);
      }

      /**
       * Purpose: Render category and submenu tree.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderTree() {
        const filteredIndexes = filteredCategoryIndexes();
        if (!filteredIndexes.length) {
          elements.tree.innerHTML = emptyTreeMarkup();
          return;
        }
        elements.tree.innerHTML = filteredIndexes.map(categoryIndex => categoryTreeMarkup(categoryIndex)).join('');
      }

      /**
       * Purpose: Build empty tree state markup.
       * Parameters: none.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function emptyTreeMarkup() {
        return `
          <div class="empty-state">
            <div>
              <i class="bi bi-search" aria-hidden="true"></i>
              <p class="mt-3 mb-1 fw-bold">Nada encontrado</p>
              <p class="mb-0">Ajuste o filtro ou carregue outro JSON.</p>
            </div>
          </div>
        `;
      }

      /**
       * Purpose: Build category tree branch markup.
       * Parameters: categoryIndex {number} category position.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function categoryTreeMarkup(categoryIndex) {
        const category = state.menu[categoryIndex];
        const hasSubmenus = category.submenus.length > 0;
        const isOpen = hasSubmenus && (state.openCategories.has(categoryIndex) || state.searchTerm);
        const isSelectedCategory = state.selected?.categoryIndex === categoryIndex && state.selected?.submenuIndex === undefined;
        const isActive = isSelectedCategory || (isStandaloneLinkCategory(category) && state.selected?.categoryIndex === categoryIndex);
        const submenuMarkup = isOpen ? category.submenus.map((submenu, submenuIndex) => submenuTreeMarkup(categoryIndex, submenuIndex)).join('') : '';
        const linkBadge = isStandaloneLinkCategory(category) ? '↗' : category.submenus.length;
        return `
          <button class="tree-row ${isActive ? 'active' : ''}" type="button" data-action="select-category" data-category-index="${categoryIndex}" role="treeitem" aria-expanded="${Boolean(isOpen)}">
            <i class="bi ${hasSubmenus ? (isOpen ? 'bi-chevron-down' : 'bi-chevron-right') : 'bi-box-arrow-up-right'}" aria-hidden="true"></i>
            <i class="fas ${escapeHtml(category.icon)} fa-fw" aria-hidden="true"></i>
            <span class="tree-row-label">${escapeHtml(category.titulo)}</span>
            <span class="tree-count">${linkBadge}</span>
          </button>
          ${submenuMarkup}
        `;
      }

      /**
       * Purpose: Build submenu row markup.
       * Parameters: categoryIndex {number} category position; submenuIndex {number} submenu position.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function submenuTreeMarkup(categoryIndex, submenuIndex) {
        const submenu = state.menu[categoryIndex].submenus[submenuIndex];
        const isActive = state.selected?.categoryIndex === categoryIndex && state.selected?.submenuIndex === submenuIndex;
        return `
          <button class="tree-row submenu ${isActive ? 'active' : ''}" type="button" data-action="select-submenu" data-category-index="${categoryIndex}" data-submenu-index="${submenuIndex}" role="treeitem">
            <i class="fas ${escapeHtml(submenu.icon)} fa-fw" aria-hidden="true"></i>
            <span class="tree-row-label">${escapeHtml(submenu.titulo)}</span>
            <span class="tree-count">${submenu.blank ? '↗' : '→'}</span>
          </button>
        `;
      }

      /**
       * Purpose: Compute indexes matching search term.
       * Parameters: none.
       * Returns: {Array<number>} visible category indexes.
       * Throws: none.
       */
      function filteredCategoryIndexes() {
        if (!state.searchTerm) {
          return state.menu.map((category, index) => index);
        }
        return state.menu
          .map((category, index) => categoryMatchesSearch(category) ? index : null)
          .filter(index => index !== null);
      }

      /**
       * Purpose: Determine if category branch matches current search.
       * Parameters: category {Object} category object.
       * Returns: {boolean} true when category or submenu matches.
       * Throws: none.
       */
      function categoryMatchesSearch(category) {
        if (textMatches(category.titulo) || textMatches(category.descricao) || textMatches(category.icon) || textMatches(category.link)) {
          return true;
        }
        return category.submenus.some(submenu => textMatches(submenu.titulo) || textMatches(submenu.descricao) || textMatches(submenu.link) || textMatches(submenu.icon));
      }

      /**
       * Purpose: Compare text against search term.
       * Parameters: value {unknown} inspected text.
       * Returns: {boolean} true when normalized text contains search term.
       * Throws: none.
       */
      function textMatches(value) {
        return String(value ?? '').toLocaleLowerCase('pt-BR').includes(state.searchTerm);
      }

      /**
       * Purpose: Render selected item editor.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderEditor() {
        const selection = selectedItem();
        if (!selection) {
          elements.editor.innerHTML = emptyEditorMarkup();
          return;
        }
        elements.editor.innerHTML = selectedEditorMarkup(selection);
      }

      /**
       * Purpose: Build empty editor markup.
       * Parameters: none.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function emptyEditorMarkup() {
        return `
          <div class="empty-state">
            <div>
              <i class="bi bi-diagram-3" aria-hidden="true"></i>
              <p class="mt-3 mb-1 fw-bold">Nenhum item selecionado</p>
              <p class="mb-0">Crie categoria ou carregue arquivo JSON.</p>
            </div>
          </div>
        `;
      }

      /**
       * Purpose: Build selected item editor markup.
       * Parameters: selection {Object} selected item descriptor.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function selectedEditorMarkup(selection) {
        const item = selection.item;
        const hasSubmenus = Array.isArray(item.submenus);
        return `
          <div class="selection-stamp">
            <div class="stamp-icon"><i class="fas ${escapeHtml(item.icon || FALLBACK_ICON)} fa-fw" aria-hidden="true"></i></div>
            <div class="min-w-0">
              <div class="stamp-path">${escapeHtml(selection.path)}</div>
              <h3 class="stamp-title">${escapeHtml(item.titulo || 'Sem título')}</h3>
              <p class="stamp-description">${escapeHtml(item.descricao || 'Sem descrição')}</p>
            </div>
          </div>

          <div class="mb-3">
            <label class="field-label" for="titleInput">Título <span class="field-help">Obrigatório</span></label>
            <input class="form-control" id="titleInput" data-field="titulo" value="${escapeHtml(item.titulo)}" autocomplete="off" />
          </div>

          <div class="mb-3">
            <label class="field-label" for="descriptionInput">Descrição <span class="field-help">Texto curto exibido no portal</span></label>
            <textarea class="form-control" id="descriptionInput" data-field="descricao" rows="4">${escapeHtml(item.descricao)}</textarea>
          </div>

          <div class="mb-3">
            <label class="field-label" for="iconInput">Ícone Font Awesome <span class="field-help">Ex.: fa-coins</span></label>
            <input class="form-control font-monospace" id="iconInput" data-field="icon" value="${escapeHtml(item.icon)}" autocomplete="off" />
          </div>

          ${iconLibraryMarkup()}

          ${selection.kind === 'submenu' ? submenuFieldsMarkup(item) : (Array.isArray(item.submenus) && item.submenus.length ? '' : standaloneLinkFieldsMarkup(item))}
          ${itemMetadataFieldsMarkup(item)}

          <div class="editor-actions">
            <button class="btn-ledger" type="button" data-editor-action="duplicate"><i class="bi bi-copy me-1" aria-hidden="true"></i> Duplicar</button>
            ${hasSubmenus ? '<button class="btn-ledger" type="button" data-editor-action="add-child"><i class="bi bi-node-plus me-1" aria-hidden="true"></i> Novo submenu</button>' : ''}
            <button class="btn-ledger btn-ledger-danger" type="button" data-editor-action="delete"><i class="bi bi-trash3 me-1" aria-hidden="true"></i> Remover</button>
          </div>
        `;
      }

      /**
       * Purpose: Build collapsed icon library entry point.
       * Parameters: none.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function iconLibraryMarkup() {
        return `
          <details class="icon-library mb-4">
            <summary>
              <span>Biblioteca rápida</span>
              <span class="field-help">Font Awesome online</span>
            </summary>
            <div class="icon-library-body">
              <div class="icon-grid compact">${ICON_LIBRARY.map(iconPickMarkup).join('')}</div>
              <button class="btn-ledger mt-2" type="button" data-editor-action="open-icon-picker">
                <i class="bi bi-search me-1" aria-hidden="true"></i> Pesquisar biblioteca completa…
              </button>
            </div>
          </details>
        `;
      }

      /**
       * Purpose: Build shared metadata switches.
       * Parameters: item {Object} selected menu item.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function itemMetadataFieldsMarkup(item) {
        return `
          <div class="metadata-switches mb-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" id="visibleInput" data-field="visible" ${item.visible !== false ? 'checked' : ''} />
              <label class="form-check-label" for="visibleInput">Visível no preview</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" id="iframeInput" data-field="iframe" ${item.iframe ? 'checked' : ''} />
              <label class="form-check-label" for="iframeInput">Abrir em iframe</label>
              <div class="form-text">Campo salvo no JSON; preview mantém link para evitar bloqueios de iframe.</div>
            </div>
          </div>
        `;
      }

      /**
       * Purpose: Build category link-only field markup.
       * Parameters: item {Object} category object.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function standaloneLinkFieldsMarkup(item) {
        return `
          <div class="mb-3">
            <label class="field-label" for="categoryLinkInput">Link da categoria <span class="field-help">Usado quando categoria não tem submenu</span></label>
            <input class="form-control font-monospace" id="categoryLinkInput" data-field="link" value="${escapeHtml(item.link)}" placeholder="https://" autocomplete="off" />
          </div>
          <div class="form-check form-switch mb-4">
            <input class="form-check-input" type="checkbox" role="switch" id="categoryBlankInput" data-field="blank" ${item.blank ? 'checked' : ''} />
            <label class="form-check-label" for="categoryBlankInput">Abrir em nova aba</label>
          </div>
        `;
      }

      /**
       * Purpose: Build submenu-only field markup.
       * Parameters: item {Object} submenu object.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function submenuFieldsMarkup(item) {
        return `
          <div class="mb-3">
            <label class="field-label" for="linkInput">Link <span class="field-help">URL de destino</span></label>
            <input class="form-control font-monospace" id="linkInput" data-field="link" value="${escapeHtml(item.link)}" placeholder="https://" autocomplete="off" />
          </div>
          <div class="form-check form-switch mb-4">
            <input class="form-check-input" type="checkbox" role="switch" id="blankInput" data-field="blank" ${item.blank ? 'checked' : ''} />
            <label class="form-check-label" for="blankInput">Abrir em nova aba</label>
          </div>
        `;
      }

      /**
       * Purpose: Build icon picker button markup.
       * Parameters: icon {string} Font Awesome class.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function iconPickMarkup(icon) {
        const currentIcon = selectedItem()?.item.icon;
        return `
          <button class="icon-pick ${currentIcon === icon ? 'active' : ''}" type="button" title="${escapeHtml(icon)}" data-editor-action="pick-icon" data-icon="${escapeHtml(icon)}">
            <i class="fas ${escapeHtml(icon)} fa-fw" aria-hidden="true"></i>
          </button>
        `;
      }

      /**
       * Purpose: Get selected item descriptor.
       * Parameters: none.
       * Returns: {Object|null} selected descriptor or null.
       * Throws: none.
       */
      function selectedItem() {
        if (!state.selected || !categoryExists(state.selected.categoryIndex)) {
          return null;
        }
        const category = state.menu[state.selected.categoryIndex];
        if (state.selected.submenuIndex === undefined) {
          return { kind: 'category', item: category, path: category.link ? 'Categoria / Link direto' : 'Categoria' };
        }
        if (!submenuExists(state.selected.categoryIndex, state.selected.submenuIndex)) {
          return null;
        }
        return {
          kind: 'submenu',
          item: category.submenus[state.selected.submenuIndex],
          path: `${category.titulo} / Submenu`
        };
      }

      /**
       * Purpose: Render inspector selected tab.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderInspector() {
        renderTabState();
        renderPreviewPanel();
        renderJsonPanel();
        renderValidationPanel();
        renderGapsPanel();
      }

      /**
       * Purpose: Render visible tab button and panel state.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderTabState() {
        document.querySelectorAll('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.tab === state.activeTab));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${state.activeTab}Panel`).classList.add('active');
        elements.activeTabBadge.textContent = tabLabel(state.activeTab);
      }

      /**
       * Purpose: Convert tab identifier to label.
       * Parameters: tab {string} tab identifier.
       * Returns: {string} human label.
       * Throws: none.
       */
      function tabLabel(tab) {
        const labels = { preview: 'Preview', json: 'JSON bruto', validate: 'Validação', gaps: 'Lacunas' };
        return labels[tab] || 'Preview';
      }

      /**
       * Purpose: Render portal preview panel.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderPreviewPanel() {
        const visibleCategories = state.menu.filter(item => item.visible !== false);
        if (!visibleCategories.length) {
          elements.previewPanel.innerHTML = emptyPreviewMarkup(state.menu.length ? 'Todos os itens estão ocultos no preview.' : 'Adicione categorias para visualizar o portal.');
          return;
        }
        elements.previewPanel.innerHTML = `<div class="preview-grid">${visibleCategories.map(previewCategoryMarkup).join('')}</div>`;
      }

      /**
       * Purpose: Build empty preview markup.
       * Parameters: none.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function emptyPreviewMarkup(message = 'Adicione categorias para visualizar o portal.') {
        return `
          <div class="empty-state">
            <div>
              <i class="bi bi-window-sidebar" aria-hidden="true"></i>
              <p class="mt-3 mb-1 fw-bold">Preview vazio</p>
              <p class="mb-0">${escapeHtml(message)}</p>
            </div>
          </div>
        `;
      }

      /**
       * Purpose: Build preview card markup for category.
       * Parameters: category {Object} category object.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function previewCategoryMarkup(category) {
        const hasLink = Boolean(category.link);
        const visibleSubmenus = category.submenus.filter(item => item.visible !== false);
        const hasSubmenus = visibleSubmenus.length > 0;
        const emptySubmenuMessage = category.submenus.length ? 'Submenus ocultos no preview.' : 'Sem submenu. Link direto na categoria.';
        return `
          <article class="preview-card">
            <header class="preview-card-header">
              <span class="preview-card-icon"><i class="fas ${escapeHtml(category.icon)} fa-fw" aria-hidden="true"></i></span>
              <div class="min-w-0">
                <h3 class="preview-card-title">${escapeHtml(category.titulo)}</h3>
                <p class="preview-card-copy">${escapeHtml(category.descricao)}</p>
              </div>
            </header>
            ${hasLink ? previewCategoryLinkMarkup(category) : ''}
            ${hasSubmenus ? `<ul class="preview-list">${visibleSubmenus.map(previewSubmenuMarkup).join('')}</ul>` : `<div class="p-3 small text-muted">${escapeHtml(emptySubmenuMessage)}</div>`}
          </article>
        `;
      }

      /**
       * Purpose: Build preview row for direct-link category.
       * Parameters: category {Object} category object.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function previewCategoryLinkMarkup(category) {
        const safeUrl = escapeHtml(category.link || '#');
        return `
          <div class="p-3 border-top border-bottom bg-body-tertiary">
            <a class="d-flex align-items-center gap-2 text-decoration-none fw-semibold" href="${safeUrl}" target="${category.blank ? '_blank' : '_self'}" rel="noopener noreferrer">
              <i class="bi ${category.blank ? 'bi-box-arrow-up-right' : 'bi-arrow-right'}" aria-hidden="true"></i>
              <span>${escapeHtml(category.linkLabel || 'Ir para categoria')}</span>
            </a>
          </div>
        `;
      }

      /**
       * Purpose: Build preview row markup for submenu.
       * Parameters: submenu {Object} submenu object.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function previewSubmenuMarkup(submenu) {
        const safeUrl = escapeHtml(submenu.link || '#');
        return `
          <li>
            <a href="${safeUrl}" target="${submenu.blank ? '_blank' : '_self'}" rel="noopener noreferrer">
              <i class="fas ${escapeHtml(submenu.icon)} fa-fw" aria-hidden="true"></i>
              <span class="text-truncate">${escapeHtml(submenu.titulo)}</span>
              <i class="bi ${submenu.blank ? 'bi-box-arrow-up-right' : 'bi-arrow-right'}" aria-hidden="true"></i>
            </a>
          </li>
        `;
      }

      /**
       * Purpose: Render raw JSON editor panel.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderJsonPanel() {
        elements.jsonPanel.innerHTML = `
          <div class="d-flex gap-2 flex-wrap mb-3">
            <button class="btn-ledger btn-ledger-primary" type="button" id="applyJsonButton"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i> Aplicar JSON</button>
            <button class="btn-ledger" type="button" id="formatJsonButton"><i class="bi bi-braces me-1" aria-hidden="true"></i> Formatar</button>
          </div>
          <label class="sr-only" for="rawJsonTextarea">JSON bruto editável</label>
          <textarea class="form-control json-textarea" id="rawJsonTextarea" spellcheck="false">${escapeHtml(currentJson())}</textarea>
        `;
        document.getElementById('applyJsonButton').addEventListener('click', applyRawJson);
        document.getElementById('formatJsonButton').addEventListener('click', formatRawJson);
      }

      /**
       * Purpose: Render schema validation panel.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderValidationPanel() {
        const validation = validateMenu(state.menu);
        if (!validation.errors.length) {
          elements.validatePanel.innerHTML = `
            <div class="validation-list">
              <div class="validation-item success"><i class="bi bi-check-circle" aria-hidden="true"></i><span>Estrutura válida: categorias, submenus e campos obrigatórios estão coerentes.</span></div>
            </div>
          `;
          return;
        }
        elements.validatePanel.innerHTML = `<div class="validation-list">${validation.errors.map(validationErrorMarkup).join('')}</div>`;
      }

      /**
       * Purpose: Build validation error markup.
       * Parameters: message {string} error message.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function validationErrorMarkup(message) {
        return `<div class="validation-item error"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i><span>${escapeHtml(message)}</span></div>`;
      }

      /**
       * Purpose: Render matrix comparison controls and results.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function renderGapsPanel() {
        if (!state.matrix.criteria.length) {
          elements.gapsPanel.innerHTML = `
            <div class="empty-state">
              <div>
                <i class="bi bi-file-earmark-diff" aria-hidden="true"></i>
                <p class="mt-3 mb-1 fw-bold">Matriz ainda não carregada</p>
                <p class="mb-3">Selecione “Matriz de Critérios 2026 (Final).CSV” para comparar com o menu atual.</p>
                <label class="btn-ledger btn-ledger-primary" for="csvFileInput">Carregar matriz CSV</label>
              </div>
            </div>
          `;
          return;
        }

        const comparison = compareMatrixToMenu();
        const visibleResults = filterComparisonResults(comparison.results);
        const menuNodes = flattenMenuNodes(state.menu);
        const selectedCount = state.matrix.selectedCriteria.size;
        const matrixOptions = [...new Set(state.matrix.criteria.map(item => item.matrix))]
          .sort((left, right) => left.localeCompare(right, 'pt-BR'))
          .map(matrix => `<option value="matrix:${escapeHtml(matrix)}" ${state.matrix.scope === `matrix:${matrix}` ? 'selected' : ''}>${escapeHtml(matrix)}</option>`)
          .join('');

        elements.gapsPanel.innerHTML = `
          <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
            <div>
              <div class="panel-kicker">Fonte</div>
              <div class="small fw-bold">${escapeHtml(state.matrix.sourceName)}</div>
            </div>
            <button class="btn-ledger" type="button" id="downloadGapReportButton"><i class="bi bi-download me-1" aria-hidden="true"></i> Relatório CSV</button>
          </div>
          <div class="gap-toolbar">
            <select class="form-select" id="matrixScopeSelect" aria-label="Escopo da matriz">
              <option value="executive" ${state.matrix.scope === 'executive' ? 'selected' : ''}>Prefeitura / Executivo</option>
              <option value="all" ${state.matrix.scope === 'all' ? 'selected' : ''}>Todas as matrizes</option>
              ${matrixOptions}
            </select>
            <select class="form-select" id="gapStatusSelect" aria-label="Status da comparação">
              <option value="gaps" ${state.matrix.status === 'gaps' ? 'selected' : ''}>Só lacunas</option>
              <option value="possible" ${state.matrix.status === 'possible' ? 'selected' : ''}>Revisar possíveis</option>
              <option value="covered" ${state.matrix.status === 'covered' ? 'selected' : ''}>Só cobertos</option>
              <option value="all" ${state.matrix.status === 'all' ? 'selected' : ''}>Todos</option>
            </select>
          </div>
          <div class="mb-2">
            <input class="form-control" id="gapSearchInput" type="search" value="${escapeHtml(state.matrix.searchTerm)}" placeholder="Filtrar por ID, dimensão ou critério" autocomplete="off" />
          </div>
          <div class="gap-summary">
            <div class="gap-stat"><strong>${comparison.counts.gap}</strong><span>Lacunas</span></div>
            <div class="gap-stat"><strong>${comparison.counts.possible}</strong><span>Possíveis</span></div>
            <div class="gap-stat"><strong>${comparison.counts.covered}</strong><span>Cobertos</span></div>
          </div>
          <div class="d-flex gap-2 flex-wrap mb-2">
            <button class="btn-ledger" type="button" id="selectVisibleCriteriaButton">Marcar visíveis</button>
            <button class="btn-ledger btn-ledger-primary" type="button" id="relateCriteriaButton" ${selectedCount ? '' : 'disabled'}>
              <i class="bi bi-link-45deg me-1" aria-hidden="true"></i> Relacionar marcados (${selectedCount})
            </button>
          </div>
          <div class="gap-list">
            ${visibleResults.length ? visibleResults.map(result => gapItemMarkup(result, menuNodes)).join('') : `
              <div class="validation-item success"><i class="bi bi-check-circle" aria-hidden="true"></i><span>Nenhum item neste filtro.</span></div>
            `}
          </div>
        `;

        document.getElementById('matrixScopeSelect').addEventListener('change', event => {
          state.matrix.scope = event.target.value;
          state.matrix.selectedCriteria.clear();
          renderGapsPanel();
        });
        document.getElementById('gapStatusSelect').addEventListener('change', event => {
          state.matrix.status = event.target.value;
          renderGapsPanel();
        });
        document.getElementById('gapSearchInput').addEventListener('input', event => {
          state.matrix.searchTerm = event.target.value;
          renderGapsPanel();
          document.getElementById('gapSearchInput')?.focus();
        });
        document.getElementById('downloadGapReportButton').addEventListener('click', downloadGapReport);
        document.getElementById('selectVisibleCriteriaButton').addEventListener('click', () => {
          const visibleKeys = visibleResults.map(result => criterionKey(result.criterion.matrix, result.criterion.id));
          const allSelected = visibleKeys.length && visibleKeys.every(key => state.matrix.selectedCriteria.has(key));
          visibleKeys.forEach(key => {
            if (allSelected) state.matrix.selectedCriteria.delete(key);
            else state.matrix.selectedCriteria.add(key);
          });
          renderGapsPanel();
        });
        document.getElementById('relateCriteriaButton').addEventListener('click', relateSelectedCriteria);
        elements.gapsPanel.querySelectorAll('[data-criterion-check]').forEach(checkbox => {
          checkbox.addEventListener('change', event => {
            const key = event.target.dataset.criterionCheck;
            if (event.target.checked) state.matrix.selectedCriteria.add(key);
            else state.matrix.selectedCriteria.delete(key);
            renderGapsPanel();
          });
        });
        elements.gapsPanel.querySelectorAll('[data-relation-target]').forEach(select => {
          select.addEventListener('change', event => {
            const key = event.target.dataset.relationTarget;
            state.matrix.relationTargets.set(key, event.target.value);
            if (event.target.value) state.matrix.selectedCriteria.add(key);
            renderGapsPanel();
          });
        });
      }

      /**
       * Purpose: Build one comparison result card.
       * Parameters: result {Object} criterion comparison result; menuNodes {Array<Object>} target nodes.
       * Returns: {string} HTML markup.
       * Throws: none.
       */
      function gapItemMarkup(result, menuNodes) {
        const statusLabels = { gap: 'Lacuna', possible: 'Possível', covered: 'Coberto' };
        const key = criterionKey(result.criterion.matrix, result.criterion.id);
        const suggestedTarget = result.status === 'gap' ? '' : result.match?.nodeId || '';
        const selectedTarget = state.matrix.relationTargets.get(key) || suggestedTarget;
        const matchDescription = result.match
          ? `${result.status === 'covered' ? 'Vínculo' : 'Sugestão'}: ${result.match.path} · ${Math.round(result.score * 100)}%`
          : 'Nenhum item relacionado encontrado no menu.';
        const targetOptions = menuNodes.map(node => `
          <option value="${escapeHtml(node.nodeId)}" ${selectedTarget === node.nodeId ? 'selected' : ''}>${escapeHtml(node.path)}</option>
        `).join('');
        return `
          <article class="gap-item ${result.status}">
            <div class="gap-item-head">
              <input class="gap-check" type="checkbox" aria-label="Selecionar critério ${escapeHtml(result.criterion.id)}" data-criterion-check="${escapeHtml(key)}" ${state.matrix.selectedCriteria.has(key) ? 'checked' : ''} />
              <span class="gap-code">${escapeHtml(result.criterion.id)}</span>
              <span class="gap-pill">${escapeHtml(result.criterion.classification || 'Sem classificação')}</span>
              <span class="gap-pill">${statusLabels[result.status]}</span>
            </div>
            <p class="gap-item-title">${escapeHtml(result.criterion.criterion)}</p>
            <p class="gap-item-match">${escapeHtml(result.criterion.matrix)} · ${escapeHtml(result.criterion.dimension)}<br>${escapeHtml(matchDescription)}</p>
            <div class="gap-relation">
              <label>Relacionar a</label>
              <select class="form-select" data-relation-target="${escapeHtml(key)}" aria-label="Item do menu para o critério ${escapeHtml(result.criterion.id)}">
                <option value="">Selecione item do menu</option>
                ${targetOptions}
              </select>
            </div>
          </article>
        `;
      }

      /**
       * Purpose: Compare applicable matrix criteria against current menu nodes.
       * Parameters: none.
       * Returns: {Object} results and status counts.
       * Throws: none.
       */
      function compareMatrixToMenu() {
        const criteria = criteriaForCurrentScope();
        const menuNodes = flattenMenuNodes(state.menu);
        const exactMatches = buildExactCriterionMatches(menuNodes);
        const results = criteria.map(criterion => compareCriterion(criterion, menuNodes, exactMatches));
        const counts = results.reduce((total, result) => {
          total[result.status] += 1;
          return total;
        }, { gap: 0, possible: 0, covered: 0 });
        return { results, counts };
      }

      /**
       * Purpose: Select criteria included by active matrix scope.
       * Parameters: none.
       * Returns: {Array<Object>} scoped criteria.
       * Throws: none.
       */
      function criteriaForCurrentScope() {
        if (state.matrix.scope === 'all') {
          return state.matrix.criteria;
        }
        if (state.matrix.scope.startsWith('matrix:')) {
          const selectedMatrix = state.matrix.scope.slice(7);
          return state.matrix.criteria.filter(item => item.matrix === selectedMatrix);
        }
        return state.matrix.criteria.filter(item => EXECUTIVE_MATRIXES.has(normalizeComparisonText(item.matrix).toUpperCase()));
      }

      /**
       * Purpose: Convert menu tree into searchable nodes, including nested submenus.
       * Parameters: menu {Array<Object>} current menu.
       * Returns: {Array<Object>} flattened node descriptors.
       * Throws: none.
       */
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
            description: String(item.descricao ?? ''),
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

      /**
       * Purpose: Read legacy and multi-value criterion references from one menu item.
       * Parameters: item {Object} menu item.
       * Returns: {Array<string>} unique criterion references.
       * Throws: none.
       */
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

      /**
       * Purpose: Persist criterion references while keeping legacy scalar compatibility.
       * Parameters: item {Object} menu item; references {Array<string>} desired references.
       * Returns: {void}.
       * Throws: none.
       */
      function setMenuItemCriterionReferences(item, references) {
        const uniqueReferences = [...new Set(references.filter(Boolean))];
        if (!uniqueReferences.length) {
          delete item.criterio_matriz;
          delete item.criterios_matriz;
          return;
        }
        item.criterio_matriz = uniqueReferences[0];
        if (uniqueReferences.length > 1) item.criterios_matriz = uniqueReferences;
        else delete item.criterios_matriz;
      }

      /**
       * Purpose: Relate checked matrix criteria to selected menu targets.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function relateSelectedCriteria() {
        const selectedKeys = [...state.matrix.selectedCriteria];
        if (!selectedKeys.length) return;

        const menuNodes = flattenMenuNodes(state.menu);
        const nodesById = new Map(menuNodes.map(node => [node.nodeId, node]));
        const criteriaByKey = new Map(state.matrix.criteria.map(criterion => [criterionKey(criterion.matrix, criterion.id), criterion]));
        const resultsByKey = new Map(compareMatrixToMenu().results.map(result => [criterionKey(result.criterion.matrix, result.criterion.id), result]));
        let relatedCount = 0;
        let skippedCount = 0;

        selectedKeys.forEach(key => {
          const criterion = criteriaByKey.get(key);
          const result = resultsByKey.get(key);
          const suggestedTarget = result?.status === 'gap' ? '' : result?.match?.nodeId || '';
          const targetId = state.matrix.relationTargets.get(key) || suggestedTarget;
          const targetNode = nodesById.get(targetId);
          if (!criterion || !targetNode) {
            skippedCount += 1;
            return;
          }

          menuNodes.forEach(node => {
            const remainingReferences = node.criterionReferences.filter(reference => {
              const parsed = parseCriterionReference(reference);
              return parsed.key !== key;
            });
            setMenuItemCriterionReferences(node.item, remainingReferences);
            node.criterionReferences = remainingReferences;
          });

          const reference = `${criterion.matrix} | ${criterion.dimension} | ${criterion.id}`;
          setMenuItemCriterionReferences(targetNode.item, [...menuItemCriterionReferences(targetNode.item), reference]);
          targetNode.criterionReferences = menuItemCriterionReferences(targetNode.item);
          relatedCount += 1;
          state.matrix.relationTargets.delete(key);
        });

        state.matrix.selectedCriteria.clear();
        if (!relatedCount) {
          showToast('Selecione um item de menu para cada critério marcado.', 'error');
          renderGapsPanel();
          return;
        }
        markDirty(`${relatedCount} critério(s) relacionado(s).${skippedCount ? ` ${skippedCount} sem destino.` : ''}`);
      }

      /**
       * Purpose: Index menu nodes carrying explicit matrix metadata.
       * Parameters: menuNodes {Array<Object>} flattened menu.
       * Returns: {Object} full-key and ID maps.
       * Throws: none.
       */
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

      /**
       * Purpose: Compare one criterion using metadata first and text similarity second.
       * Parameters: criterion {Object}; menuNodes {Array<Object>}; exactMatches {Object}.
       * Returns: {Object} comparison result.
       * Throws: none.
       */
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

      /**
       * Purpose: Score semantic overlap between criterion and menu node.
       * Parameters: criterion {Object}; node {Object}.
       * Returns: {number} score from 0 to 1.
       * Throws: none.
       */
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

      /**
       * Purpose: Produce significant normalized words for fuzzy comparison.
       * Parameters: value {unknown} source text.
       * Returns: {Set<string>} token set.
       * Throws: none.
       */
      function significantTokens(value) {
        return new Set(normalizeComparisonText(value)
          .split(' ')
          .filter(token => token.length >= 3 && !MATCH_STOP_WORDS.has(token)));
      }

      /**
       * Purpose: Calculate Dice similarity for two token sets.
       * Parameters: left {Set<string>}; right {Set<string>}.
       * Returns: {number} score from 0 to 1.
       * Throws: none.
       */
      function diceSimilarity(left, right) {
        if (!left.size || !right.size) return 0;
        let overlap = 0;
        left.forEach(token => {
          if (right.has(token)) overlap += 1;
        });
        return (2 * overlap) / (left.size + right.size);
      }

      /**
       * Purpose: Normalize accents, punctuation, and spacing for comparison.
       * Parameters: value {unknown} source text.
       * Returns: {string} normalized text.
       * Throws: none.
       */
      function normalizeComparisonText(value) {
        return String(value ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u00a0/g, ' ')
          .toLocaleLowerCase('pt-BR')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim()
          .replace(/\s+/g, ' ');
      }

      /**
       * Purpose: Parse "MATRIX | DIMENSION | ID" menu metadata.
       * Parameters: value {unknown} metadata value.
       * Returns: {Object} normalized matrix, ID, and key.
       * Throws: none.
       */
      function parseCriterionReference(value) {
        const parts = String(value ?? '').split('|').map(part => part.trim()).filter(Boolean);
        const matrix = parts[0] || '';
        const id = normalizeCriterionId(parts.at(-1) || '');
        return { matrix, id, key: matrix && id ? criterionKey(matrix, id) : '' };
      }

      /**
       * Purpose: Build stable matrix criterion key.
       * Parameters: matrix {string}; id {string}.
       * Returns: {string} normalized key.
       * Throws: none.
       */
      function criterionKey(matrix, id) {
        return `${normalizeComparisonText(matrix)}|${normalizeCriterionId(id)}`;
      }

      /**
       * Purpose: Normalize criterion IDs with stray spaces and terminal punctuation.
       * Parameters: value {unknown} criterion ID.
       * Returns: {string} normalized ID.
       * Throws: none.
       */
      function normalizeCriterionId(value) {
        return String(value ?? '').replace(/\u00a0/g, ' ').trim().replace(/\.+$/, '').replace(/\s+/g, '');
      }

      /**
       * Purpose: Filter comparison list by status and free-text query.
       * Parameters: results {Array<Object>} comparison results.
       * Returns: {Array<Object>} visible results.
       * Throws: none.
       */
      function filterComparisonResults(results) {
        const query = normalizeComparisonText(state.matrix.searchTerm);
        return results.filter(result => {
          if (state.matrix.status !== 'all' && result.status !== state.matrix.status.replace('gaps', 'gap')) return false;
          if (!query) return true;
          const searchable = normalizeComparisonText([
            result.criterion.id,
            result.criterion.matrix,
            result.criterion.dimension,
            result.criterion.classification,
            result.criterion.criterion,
            result.match?.path
          ].join(' '));
          return searchable.includes(query);
        });
      }

      /**
       * Purpose: Validate menu shape and required business fields.
       * Parameters: menu {unknown} menu candidate.
       * Returns: {Object} validation result.
       * Throws: none.
       */
      function validateMenu(menu) {
        const errors = [];
        if (!Array.isArray(menu)) {
          return { errors: ['Raiz do JSON precisa ser um array.'] };
        }
        menu.forEach((category, categoryIndex) => validateCategory(category, categoryIndex, errors));
        return { errors };
      }

      /**
       * Purpose: Validate category item.
       * Parameters: category {Object} category; categoryIndex {number} position; errors {Array<string>} mutable error list.
       * Returns: {void}.
       * Throws: none.
       */
      function validateCategory(category, categoryIndex, errors) {
        const label = `Categoria ${categoryIndex + 1}`;
        if (!category.titulo.trim()) errors.push(`${label} sem título.`);
        if (!category.icon.trim()) errors.push(`${label} sem ícone.`);
        if (!category.descricao.trim()) errors.push(`${label} sem descrição.`);
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

      /**
       * Purpose: Validate submenu item.
       * Parameters: submenu {Object} submenu; categoryIndex {number} category position; submenuIndex {number} submenu position; errors {Array<string>} mutable error list.
       * Returns: {void}.
       * Throws: none.
       */
      function validateSubmenu(submenu, categoryIndex, submenuIndex, errors) {
        const label = `Categoria ${categoryIndex + 1}, submenu ${submenuIndex + 1}`;
        if (!submenu.titulo.trim()) errors.push(`${label} sem título.`);
        if (!submenu.icon.trim()) errors.push(`${label} sem ícone.`);
        if (!submenu.descricao.trim()) errors.push(`${label} sem descrição.`);
        const submenuLink = String(submenu.link ?? '').trim();
        if (!submenuLink) errors.push(`${label} sem link.`);
        if (submenuLink && !isProbablyValidUrl(submenuLink)) errors.push(`${label} com link possivelmente inválido.`);
      }

      /**
       * Purpose: Validate URL syntax conservatively for portal links.
       * Parameters: value {string} URL string.
       * Returns: {boolean} true when URL is likely valid.
       * Throws: none.
       */
      function isProbablyValidUrl(value) {
        try {
          const parsedUrl = new URL(value);
          return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
        } catch (urlError) {
          return false;
        }
      }

      /**
       * Purpose: Handle file input change.
       * Parameters: event {Event} file input event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleFileInputChange(event) {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }
        readJsonFile(file);
        event.target.value = '';
      }

      /**
       * Purpose: Handle one or more matrix CSV files.
       * Parameters: event {Event} file input event.
       * Returns: {Promise<void>} matrix loading operation.
       * Throws: none.
       */
      async function handleCsvFileInputChange(event) {
        const files = [...(event.target.files || [])];
        if (!files.length) return;
        await readMatrixFiles(files);
        event.target.value = '';
      }

      /**
       * Purpose: Decode, parse, and merge selected matrix CSV files.
       * Parameters: files {Array<File>} selected CSV files.
       * Returns: {Promise<void>} matrix loading operation.
       * Throws: none.
       */
      async function readMatrixFiles(files) {
        try {
          const parsedFiles = await Promise.all(files.map(async file => {
            const buffer = await file.arrayBuffer();
            return parseMatrixCsv(decodeCsvBuffer(buffer));
          }));
          const uniqueCriteria = new Map();
          parsedFiles.flat().forEach(criterion => uniqueCriteria.set(criterionKey(criterion.matrix, criterion.id), criterion));
          state.matrix.criteria = [...uniqueCriteria.values()];
          state.matrix.sourceName = files.map(file => file.name).join(', ');
          state.matrix.status = 'gaps';
          state.matrix.searchTerm = '';
          state.matrix.selectedCriteria.clear();
          state.matrix.relationTargets.clear();
          state.activeTab = 'gaps';
          renderInspector();
          showToast(`${state.matrix.criteria.length} critérios carregados para comparação.`, 'success');
        } catch (csvError) {
          showToast(`CSV inválido: ${csvError.message}`, 'error');
        }
      }

      /**
       * Purpose: Decode UTF-8 or Windows-1252 matrix bytes.
       * Parameters: buffer {ArrayBuffer} file bytes.
       * Returns: {string} decoded CSV text.
       * Throws: none.
       */
      function decodeCsvBuffer(buffer) {
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch (utf8Error) {
          return new TextDecoder('windows-1252').decode(buffer);
        }
      }

      /**
       * Purpose: Parse matrix CSV into normalized criteria.
       * Parameters: csvText {string} decoded CSV.
       * Returns: {Array<Object>} criteria.
       * Throws: Error when expected columns are absent.
       */
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

      /**
       * Purpose: Parse delimited text with quoted delimiters, escaped quotes, and multiline fields.
       * Parameters: text {string}; delimiter {string}.
       * Returns: {Array<Array<string>>} parsed rows.
       * Throws: Error for unclosed quoted field.
       */
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
        if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
        return rows;
      }

      /**
       * Purpose: Read and apply JSON file from File API.
       * Parameters: file {File} selected file.
       * Returns: {void}.
       * Throws: none.
       */
      function readJsonFile(file) {
        const reader = new FileReader();
        reader.addEventListener('load', () => applyLoadedJson(String(reader.result ?? ''), file.name));
        reader.addEventListener('error', () => showToast('Não foi possível ler o arquivo selecionado.', 'error'));
        reader.readAsText(file, 'utf-8');
      }

      /**
       * Purpose: Parse and apply loaded JSON string.
       * Parameters: rawJson {string} file content; sourceName {string} filename label.
       * Returns: {void}.
       * Throws: none.
       */
      function applyLoadedJson(rawJson, sourceName) {
        try {
          const parsedJson = JSON.parse(rawJson);
          state.menu = normalizeMenu(parsedJson);
          state.sourceName = sourceName;
          state.selected = state.menu.length ? { categoryIndex: 0 } : null;
          state.openCategories = new Set(state.menu.length ? [0] : []);
          markDirty('Arquivo carregado.');
        } catch (parseError) {
          showToast(`JSON inválido: ${parseError.message}`, 'error');
        }
      }

      /**
       * Purpose: Handle tree row selection.
       * Parameters: event {MouseEvent} delegated click event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleTreeClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const categoryIndex = Number(target.dataset.categoryIndex);
        if (target.dataset.action === 'select-category') {
          selectCategory(categoryIndex);
          return;
        }
        selectSubmenu(categoryIndex, Number(target.dataset.submenuIndex));
      }

      /**
       * Purpose: Select category and toggle branch.
       * Parameters: categoryIndex {number} category position.
       * Returns: {void}.
       * Throws: none.
       */
      function selectCategory(categoryIndex) {
        if (!categoryExists(categoryIndex)) {
          return;
        }
        state.selected = { categoryIndex };
        toggleCategoryOpen(categoryIndex);
        renderApplication();
      }

      /**
       * Purpose: Select submenu item.
       * Parameters: categoryIndex {number} category position; submenuIndex {number} submenu position.
       * Returns: {void}.
       * Throws: none.
       */
      function selectSubmenu(categoryIndex, submenuIndex) {
        if (!submenuExists(categoryIndex, submenuIndex)) {
          return;
        }
        state.selected = { categoryIndex, submenuIndex };
        state.openCategories.add(categoryIndex);
        renderApplication();
      }

      /**
       * Purpose: Toggle category visibility.
       * Parameters: categoryIndex {number} category position.
       * Returns: {void}.
       * Throws: none.
       */
      function toggleCategoryOpen(categoryIndex) {
        if (state.openCategories.has(categoryIndex)) {
          state.openCategories.delete(categoryIndex);
          return;
        }
        state.openCategories.add(categoryIndex);
      }

      /**
       * Purpose: Handle form text input changes.
       * Parameters: event {InputEvent} delegated input event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleEditorInput(event) {
        const target = event.target;
        if (!target.matches('[data-field]') || target.type === 'checkbox') {
          return;
        }
        updateSelectedField(target.dataset.field, target.value, { skipEditorRender: true });
      }

      /**
       * Purpose: Handle checkbox and action changes.
       * Parameters: event {Event} delegated change event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleEditorChange(event) {
        const target = event.target;
        if (['blank', 'iframe', 'visible'].includes(target.dataset.field)) {
          updateSelectedField(target.dataset.field, target.checked);
          return;
        }
        const actionTarget = event.target.closest('[data-editor-action]');
        if (actionTarget) {
          runEditorAction(actionTarget);
        }
      }

      /**
       * Purpose: Delegate editor button actions.
       * Parameters: event {MouseEvent} delegated event.
       * Returns: {void}.
       * Throws: none.
       */
      elements.editor.addEventListener('click', event => {
        const actionTarget = event.target.closest('[data-editor-action]');
        if (!actionTarget) {
          return;
        }
        runEditorAction(actionTarget);
      });

      /**
       * Purpose: Execute editor action from button.
       * Parameters: actionTarget {HTMLElement} clicked action button.
       * Returns: {void}.
       * Throws: none.
       */
      function runEditorAction(actionTarget) {
        const action = actionTarget.dataset.editorAction;
        if (action === 'pick-icon') {
          updateSelectedField('icon', actionTarget.dataset.icon);
          return;
        }
        if (action === 'open-icon-picker') {
          openIconPicker();
          return;
        }
        if (action === 'duplicate') {
          duplicateSelection();
          return;
        }
        if (action === 'add-child') {
          addSubmenuToSelection();
          return;
        }
        if (action === 'delete') {
          deleteSelection();
        }
      }

      /**
       * Purpose: Update selected item field.
       * Parameters: field {string} editable field name; value {unknown} new value.
       * Returns: {void}.
       * Throws: none.
       */
      function updateSelectedField(field, value, opts) {
        const selection = selectedItem();
        if (!selection) {
          return;
        }
        selection.item[field] = value;
        markDirty(null, opts);
      }

      /**
       * Purpose: Add new category.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function addCategory() {
        const categoryIndex = state.menu.length;
        state.menu.push({ titulo: 'Nova categoria', icon: 'fa-landmark', descricao: '', link: '', blank: false, iframe: false, visible: true, submenus: [] });
        state.selected = { categoryIndex };
        state.openCategories.add(categoryIndex);
        markDirty('Categoria criada.');
      }

      /**
       * Purpose: Add submenu under selected or active category.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function addSubmenuToSelection() {
        const categoryIndex = activeCategoryIndex();
        if (!categoryExists(categoryIndex)) {
          showToast('Selecione uma categoria antes de criar submenu.', 'error');
          return;
        }
        const category = state.menu[categoryIndex];
        if (isStandaloneLinkCategory(category) && category.link) {
          showToast('Categoria com link direto não aceita submenu.', 'error');
          return;
        }
        const submenuIndex = category.submenus.length;
        category.submenus.push({ titulo: 'Novo submenu', icon: 'fa-file-alt', descricao: '', link: '', blank: true, iframe: false, visible: true });
        state.selected = { categoryIndex, submenuIndex };
        state.openCategories.add(categoryIndex);
        markDirty('Submenu criado.');
      }

      /**
       * Purpose: Resolve active category index for actions.
       * Parameters: none.
       * Returns: {number|null} category index or null.
       * Throws: none.
       */
      function activeCategoryIndex() {
        if (state.selected && categoryExists(state.selected.categoryIndex)) {
          return state.selected.categoryIndex;
        }
        return state.menu.length ? 0 : null;
      }

      /**
       * Purpose: Duplicate current selected item.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function duplicateSelection() {
        if (!state.selected) {
          return;
        }
        if (state.selected.submenuIndex === undefined) {
          duplicateCategory();
          return;
        }
        duplicateSubmenu();
      }

      /**
       * Purpose: Duplicate selected category.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function duplicateCategory() {
        const categoryIndex = state.selected.categoryIndex;
        const duplicatedCategory = cloneJson(state.menu[categoryIndex]);
        duplicatedCategory.titulo = `${duplicatedCategory.titulo} (cópia)`;
        const insertedIndex = categoryIndex + 1;
        rebuildOpenCategoriesAfterInsert(insertedIndex);
        state.menu.splice(insertedIndex, 0, duplicatedCategory);
        state.selected = { categoryIndex: insertedIndex };
        if (duplicatedCategory.submenus.length) state.openCategories.add(insertedIndex);
        markDirty('Categoria duplicada.');
      }

      /**
       * Purpose: Duplicate selected submenu.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function duplicateSubmenu() {
        const categoryIndex = state.selected.categoryIndex;
        const submenuIndex = state.selected.submenuIndex;
        const duplicatedSubmenu = cloneJson(state.menu[categoryIndex].submenus[submenuIndex]);
        duplicatedSubmenu.titulo = `${duplicatedSubmenu.titulo} (cópia)`;
        state.menu[categoryIndex].submenus.splice(submenuIndex + 1, 0, duplicatedSubmenu);
        state.selected = { categoryIndex, submenuIndex: submenuIndex + 1 };
        markDirty('Submenu duplicado.');
      }

      /**
       * Purpose: Delete selected item.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function deleteSelection() {
        if (!state.selected) {
          return;
        }
        if (state.selected.submenuIndex === undefined) {
          deleteCategory();
          return;
        }
        deleteSubmenu();
      }

      /**
       * Purpose: Delete selected category.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function deleteCategory() {
        const categoryIndex = state.selected.categoryIndex;
        state.menu.splice(categoryIndex, 1);
        rebuildOpenCategoriesAfterDelete(categoryIndex);
        state.selected = state.menu.length ? { categoryIndex: Math.max(0, categoryIndex - 1) } : null;
        markDirty('Categoria removida.');
      }

      /**
       * Purpose: Delete selected submenu.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function deleteSubmenu() {
        const categoryIndex = state.selected.categoryIndex;
        const submenuIndex = state.selected.submenuIndex;
        state.menu[categoryIndex].submenus.splice(submenuIndex, 1);
        state.selected = { categoryIndex };
        markDirty('Submenu removido.');
      }

      /**
       * Purpose: Move selected item up or down.
       * Parameters: direction {number} -1 up or 1 down.
       * Returns: {void}.
       * Throws: none.
       */
      function moveSelection(direction) {
        if (!state.selected) {
          return;
        }
        if (state.selected.submenuIndex === undefined) {
          moveCategory(direction);
          return;
        }
        moveSubmenu(direction);
      }

      /**
       * Purpose: Move selected category.
       * Parameters: direction {number} -1 up or 1 down.
       * Returns: {void}.
       * Throws: none.
       */
      function moveCategory(direction) {
        const currentIndex = state.selected.categoryIndex;
        const targetIndex = currentIndex + direction;
        if (!categoryExists(targetIndex)) {
          return;
        }
        swapItems(state.menu, currentIndex, targetIndex);
        state.selected = { categoryIndex: targetIndex };
        rebuildOpenCategoriesAfterMove(currentIndex, targetIndex);
        markDirty('Categoria movida.');
      }

      /**
       * Purpose: Move selected submenu.
       * Parameters: direction {number} -1 up or 1 down.
       * Returns: {void}.
       * Throws: none.
       */
      function moveSubmenu(direction) {
        const categoryIndex = state.selected.categoryIndex;
        const currentIndex = state.selected.submenuIndex;
        const targetIndex = currentIndex + direction;
        if (!submenuExists(categoryIndex, targetIndex)) {
          return;
        }
        swapItems(state.menu[categoryIndex].submenus, currentIndex, targetIndex);
        state.selected = { categoryIndex, submenuIndex: targetIndex };
        markDirty('Submenu movido.');
      }

      /**
       * Purpose: Swap array items by index.
       * Parameters: collection {Array} target collection; firstIndex {number} first position; secondIndex {number} second position.
       * Returns: {void}.
       * Throws: none.
       */
      function swapItems(collection, firstIndex, secondIndex) {
        [collection[firstIndex], collection[secondIndex]] = [collection[secondIndex], collection[firstIndex]];
      }

      /**
       * Purpose: Keep expanded branches aligned after category reorder.
       * Parameters: firstIndex {number} original position; secondIndex {number} new position.
       * Returns: {void}.
       * Throws: none.
       */
      function rebuildOpenCategoriesAfterMove(firstIndex, secondIndex) {
        const nextOpenCategories = new Set();
        state.openCategories.forEach(index => {
          if (index === firstIndex) nextOpenCategories.add(secondIndex);
          if (index === secondIndex) nextOpenCategories.add(firstIndex);
          if (index !== firstIndex && index !== secondIndex) nextOpenCategories.add(index);
        });
        state.openCategories = nextOpenCategories;
      }

      /**
       * Purpose: Keep expanded branches aligned after category insertion.
       * Parameters: insertedIndex {number} position where category is inserted.
       * Returns: {void}.
       * Throws: none.
       */
      function rebuildOpenCategoriesAfterInsert(insertedIndex) {
        const nextOpenCategories = new Set();
        state.openCategories.forEach(index => {
          nextOpenCategories.add(index >= insertedIndex ? index + 1 : index);
        });
        state.openCategories = nextOpenCategories;
      }

      /**
       * Purpose: Keep expanded branches aligned after category deletion.
       * Parameters: deletedIndex {number} removed category position.
       * Returns: {void}.
       * Throws: none.
       */
      function rebuildOpenCategoriesAfterDelete(deletedIndex) {
        const nextOpenCategories = new Set();
        state.openCategories.forEach(index => {
          if (index < deletedIndex) nextOpenCategories.add(index);
          if (index > deletedIndex) nextOpenCategories.add(index - 1);
        });
        state.openCategories = nextOpenCategories;
      }

      /**
       * Purpose: Mark state as modified and refresh UI.
       * Parameters: message {string|undefined} optional toast message.
       * Returns: {void}.
       * Throws: none.
       */
      function markDirty(message, opts) {
        state.dirty = true;
        persistState();
        renderApplication(opts);
        if (message) {
          showToast(message, 'success');
        }
      }

      /**
       * Purpose: Handle search field changes.
       * Parameters: event {InputEvent} search input event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleSearchInput(event) {
        state.searchTerm = event.target.value.trim().toLocaleLowerCase('pt-BR');
        renderTree();
      }

      /**
       * Purpose: Toggle all category branches open or closed.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function toggleAllCategories() {
        if (state.openCategories.size === state.menu.length) {
          state.openCategories = new Set();
          renderTree();
          return;
        }
        state.openCategories = new Set(state.menu.map((category, index) => index));
        renderTree();
      }

      /**
       * Purpose: Handle inspector tab clicks.
       * Parameters: event {MouseEvent} tab click event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleTabClick(event) {
        state.activeTab = event.currentTarget.dataset.tab;
        renderInspector();
      }

      /**
       * Purpose: Apply raw JSON textarea content.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function applyRawJson() {
        const textarea = document.getElementById('rawJsonTextarea');
        try {
          state.menu = normalizeMenu(JSON.parse(textarea.value));
          state.selected = state.menu.length ? { categoryIndex: 0 } : null;
          state.openCategories = new Set(state.menu.length ? [0] : []);
          markDirty('JSON aplicado.');
        } catch (parseError) {
          showToast(`JSON inválido: ${parseError.message}`, 'error');
        }
      }

      /**
       * Purpose: Format raw JSON textarea content.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function formatRawJson() {
        const textarea = document.getElementById('rawJsonTextarea');
        try {
          textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
          showToast('JSON formatado.', 'success');
        } catch (parseError) {
          showToast(`JSON inválido: ${parseError.message}`, 'error');
        }
      }

      /**
       * Purpose: Download current JSON as menu.json.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function downloadJsonFile() {
        const blob = new Blob([currentJson()], { type: 'application/json;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = 'menu.json';
        anchor.click();
        URL.revokeObjectURL(objectUrl);
        showToast('Download de menu.json iniciado.', 'success');
      }

      /**
       * Purpose: Download scoped matrix comparison as CSV.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function downloadGapReport() {
        const results = compareMatrixToMenu().results;
        const header = ['STATUS', 'MATRIZ', 'DIMENSÃO', 'ID', 'CLASSIFICAÇÃO', 'CRITÉRIO', 'CORRESPONDÊNCIA', 'CONFIANÇA'];
        const lines = [
          header,
          ...results.map(result => [
            result.status === 'gap' ? 'LACUNA' : result.status === 'possible' ? 'POSSÍVEL' : 'COBERTO',
            result.criterion.matrix,
            result.criterion.dimension,
            result.criterion.id,
            result.criterion.classification,
            result.criterion.criterion,
            result.match?.path || '',
            `${Math.round(result.score * 100)}%`
          ])
        ].map(row => row.map(csvField).join(';'));
        const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = 'relatorio-lacunas-menu.csv';
        anchor.click();
        URL.revokeObjectURL(objectUrl);
        showToast('Relatório de lacunas gerado.', 'success');
      }

      /**
       * Purpose: Escape one field for semicolon-delimited CSV.
       * Parameters: value {unknown} field value.
       * Returns: {string} quoted CSV field.
       * Throws: none.
       */
      function csvField(value) {
        return `"${String(value ?? '').replaceAll('"', '""')}"`;
      }

      /**
       * Purpose: Copy current JSON to clipboard.
       * Parameters: none.
       * Returns: {Promise<void>} clipboard operation.
       * Throws: none.
       */
      async function copyJsonToClipboard() {
        try {
          await navigator.clipboard.writeText(currentJson());
          showToast('JSON copiado para área de transferência.', 'success');
        } catch (clipboardError) {
          showToast('Não foi possível copiar. Use aba JSON bruto.', 'error');
        }
      }

      /**
       * Purpose: Reset editor to embedded base JSON.
       * Parameters: none.
       * Returns: {void}.
       * Throws: none.
       */
      function resetToEmbeddedMenu() {
        state.menu = cloneJson(state.initialMenu);
        state.sourceName = 'Base embutida';
        state.selected = state.menu.length ? { categoryIndex: 0 } : null;
        state.openCategories = new Set(state.menu.length ? [0] : []);
        localStorage.removeItem(STORAGE_KEY);
        markDirty('Base restaurada.');
      }

      /**
       * Purpose: Highlight drop target while file is dragged.
       * Parameters: event {DragEvent} drag event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleDragOver(event) {
        event.preventDefault();
        elements.dropZone.classList.add('drop-target');
      }

      /**
       * Purpose: Remove drop target highlight.
       * Parameters: event {DragEvent} drag event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleDragLeave(event) {
        if (!elements.dropZone.contains(event.relatedTarget)) {
          elements.dropZone.classList.remove('drop-target');
        }
      }

      /**
       * Purpose: Load dropped JSON or matrix CSV files.
       * Parameters: event {DragEvent} drop event.
       * Returns: {void}.
       * Throws: none.
       */
      function handleFileDrop(event) {
        event.preventDefault();
        elements.dropZone.classList.remove('drop-target');
        const files = [...(event.dataTransfer.files || [])];
        if (!files.length) return;
        const csvFiles = files.filter(file => file.name.toLocaleLowerCase('pt-BR').endsWith('.csv'));
        if (csvFiles.length) {
          readMatrixFiles(csvFiles);
          return;
        }
        readJsonFile(files[0]);
      }

      /**
       * Purpose: Show transient toast message.
       * Parameters: message {string} message text; tone {string} success or error.
       * Returns: {void}.
       * Throws: none.
       */
      function showToast(message, tone = 'success') {
        const toast = document.createElement('div');
        const icon = tone === 'error' ? 'bi-exclamation-triangle text-danger' : 'bi-check-circle text-success';
        toast.className = 'app-toast';
        toast.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
        elements.toastStack.appendChild(toast);
        window.setTimeout(() => toast.remove(), 4200);
      }

      async function loadFaIcons() {
        if (faFreeSolid !== null) {
          return faFreeSolid;
        }
        try {
          const version = await loadFontAwesomeVersion();
          const icons = await loadFreeSolidIconsFromPackage(version);
          if (!icons.length) throw new Error('Lista de ícones vazia.');
          faFreeSolid = icons;
        } catch {
          faFreeSolid = [...ICON_LIBRARY];
          showToast('Não foi possível carregar ícones online — usando lista reduzida.', 'error');
        }
        return faFreeSolid;
      }

      async function loadFontAwesomeVersion() {
        return FONT_AWESOME_VERSION;
      }

      async function loadFreeSolidIconsFromPackage(version) {
        const res = await fetch(`https://cdn.jsdelivr.net/npm/${FONT_AWESOME_SOLID_PACKAGE}@${version}/index.mjs`);
        if (!res.ok) throw new Error(`Font Awesome CDN retornou ${res.status}.`);
        const source = await res.text();
        const matches = [...source.matchAll(/iconName:\s*['"]([^'"]+)['"]/g)];
        return [...new Set(matches.map(match => normalizeFaIconName(match[1])).filter(Boolean))].sort();
      }

      function normalizeFaIconName(name) {
        const value = String(name || '').trim();
        if (!value) return '';
        return value.startsWith('fa-') ? value : `fa-${value}`;
      }

      async function openIconPicker() {
        const dialog = document.getElementById('iconPickerDialog');
        const grid = document.getElementById('iconPickerGrid');
        document.getElementById('iconPickerSearch').value = '';
        grid.innerHTML = '<p style="padding:24px;text-align:center;grid-column:1/-1">Carregando ícones…</p>';
        document.getElementById('iconPickerEmpty').hidden = true;
        dialog.showModal();
        await loadFaIcons();
        renderIconPickerGrid('');
      }

      function renderIconPickerGrid(filter) {
        const q = filter.trim().toLowerCase();
        const source = faFreeSolid ?? ICON_LIBRARY;
        const matches = q ? source.filter(n => n.slice(3).includes(q)) : source;
        const grid = document.getElementById('iconPickerGrid');
        const empty = document.getElementById('iconPickerEmpty');
        const currentIcon = selectedItem()?.item.icon;
        const visible = matches.slice(0, 300);
        grid.innerHTML = visible.map(icon => `
          <button class="icon-pick ${currentIcon === icon ? 'active' : ''}"
                  type="button" title="${escapeHtml(icon)}"
                  data-picker-icon="${escapeHtml(icon)}">
            <i class="fas ${escapeHtml(icon)} fa-fw" aria-hidden="true"></i>
          </button>`).join('');
        if (matches.length > 300) {
          grid.insertAdjacentHTML('beforeend',
            `<p class="icon-picker-empty" style="grid-column:1/-1">Mostrando 300 de ${matches.length}. Refine a busca.</p>`);
        }
        empty.hidden = matches.length > 0;
      }

      initializeApplication();
