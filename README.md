# Menu Transparência — Editor e Validador da Matriz de Critérios

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Tool: Vite](https://img.shields.io/badge/Build%20Tool-Vite-646CFF.svg)](https://vitejs.dev/)
[![Testing: Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33.svg)](https://playwright.dev/)
[![Testing: Vitest](https://img.shields.io/badge/Unit-Vitest-729B1B.svg)](https://vitest.dev/)

Aplicação web interativa para auditoria, edição visual e validação estrutural da árvore de navegação e menus do **Portal da Transparência Municipal** em conformidade com a **Matriz de Critérios de Transparência Pública 2026**.

---

## 🎯 Objetivo

Garantir que a estrutura de menus e links do portal de transparência atenda rigorosamente a todos os itens obrigatórios e essenciais exigidos pelos órgãos fiscalizadores (Tribunais de Contas e Legislação de Acesso à Informação).

---

## ✨ Recursos

- **Visualização Hierárquica:** Árvore interativa de seções, categorias e itens de menu.
- **Auditoria Automatizada:** Verificação instantânea contra o arquivo da Matriz de Critérios (`Matriz de Critérios 2026 (Final).CSV`).
- **Validação de JSON:** Importação, alteração e exportação segura dos arquivos de dados (`menu_atualizado.json`, `menu_populado.json`).
- **Bateria de Testes Completa:** Testes unitários com Vitest e testes ponta a ponta (E2E) com Playwright.

---

## 💻 Desenvolvimento Local

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

### 3. Executar Testes Unitários
```bash
npm run test:unit
```

### 4. Executar Testes E2E (Playwright)
```bash
npm run test:e2e
```

### 5. Validação Completa do Projeto
```bash
npm run verify
```

---

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE).
