/**
 * @file main.js
 * @purpose Browser module entry for styles and application boot.
 * @dependencies src/styles/main.css and src/app.js.
 * @usage Referenced from index.html as the only module script.
 */
import './styles/main.css';
import './app.js';

const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
let reloadAfterPwaUpdate = false;

function renderBuildIdentifier() {
  const buildIdentifier = document.getElementById('buildIdentifier');
  if (!buildIdentifier) return;
  buildIdentifier.textContent = BUILD_ID;
  buildIdentifier.title = BUILD_ID;
}

function promptForPwaUpdate(worker) {
  if (!window.confirm('Nova versão disponível. Recarregar agora?')) return;
  reloadAfterPwaUpdate = true;
  worker.postMessage({ type: 'SKIP_WAITING' });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`./sw.js?build=${encodeURIComponent(BUILD_ID)}`, { scope: './' });
      if (registration.waiting && navigator.serviceWorker.controller) {
        promptForPwaUpdate(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptForPwaUpdate(newWorker);
          }
        });
      });
    } catch (registrationError) {
      console.warn('Service worker registration failed.', registrationError);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadAfterPwaUpdate) window.location.reload();
  });
}

renderBuildIdentifier();
registerServiceWorker();
