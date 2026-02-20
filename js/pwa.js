let deferredInstallPrompt = null;

export function initPWA() {
  registerServiceWorker();
  initInstallPrompt();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
    } catch (err) {
      console.warn('[PWA] Service worker registration failed:', err);
    }
  });
}

function initInstallPrompt() {
  const installBtn = document.getElementById('install-btn');
  if (!installBtn) return;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });

  installBtn.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.style.display = 'none';
      return;
    }

    if (isIOS() && !isStandaloneIOS()) {
      window.alert(
        'Sur iPhone/iPad: touchez Partager, puis "Sur l’ecran d’accueil" pour installer l’application.'
      );
    }
  });

  if (isIOS() && !isStandaloneIOS()) {
    installBtn.style.display = 'inline-flex';
  }
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneIOS() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
