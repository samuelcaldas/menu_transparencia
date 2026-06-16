import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

function safeShortSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch (gitError) {
    return 'nogit';
  }
}

function compactTimestamp() {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 17);
}

function buildIdentifier() {
  const shortSha = safeShortSha();
  if (process.env.GITHUB_RUN_NUMBER || process.env.GITHUB_RUN_ID) {
    const run = process.env.GITHUB_RUN_NUMBER || process.env.GITHUB_RUN_ID;
    const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
    return `ci-${run}.${attempt}-${shortSha}`;
  }
  return `local-${compactTimestamp()}-${shortSha}`;
}

const buildId = buildIdentifier();

export default defineConfig({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(buildId)
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  build: {
    outDir: 'dist'
  }
});
