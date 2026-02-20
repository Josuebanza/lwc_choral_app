/**
 * SETUP.JS — Logique de l'écran de configuration
 *
 * Gère :
 *  - Les onglets "Fichier XLSX" / "Google Sheets"
 *  - Le drag & drop du fichier
 *  - Le chargement du cache localStorage
 *  - La validation des formulaires avant activation des boutons
 *
 * Après chargement réussi des données, appelle launchApp() depuis main.js.
 */

import { parseXLSX, parseGoogleSheets } from './parser.js';
import { loadFromCache }                from './state.js';
import { showToast }                    from './utils.js';

const DEFAULT_XLSX_PATH = 'data/LWC - Repertoire + Range + Key + Progression.xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialise tous les écouteurs de l'écran de setup.
 * Appelée une seule fois depuis main.js au chargement de la page.
 *
 * @param {Function} onDataLoaded - Callback appelé avec les données parsées
 */
export function initSetup(onDataLoaded) {
  setupTabs();
  setupDropZone(onDataLoaded);
  setupUploadBtn(onDataLoaded);
  setupDefaultDataBtn(onDataLoaded);
  setupSheetsBtn(onDataLoaded);
  setupCacheBtn(onDataLoaded);
  setupSheetsValidation();
}


// ─────────────────────────────────────────────────────────────────────────────
// ONGLETS
// ─────────────────────────────────────────────────────────────────────────────

function setupTabs() {
  const tabs = document.querySelectorAll('.setup-tab-btn');
  const panels = document.querySelectorAll('.setup-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Désactive tous les onglets
      tabs.forEach(t   => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Active l'onglet cliqué
      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.panel);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// DRAG & DROP DU FICHIER XLSX
// ─────────────────────────────────────────────────────────────────────────────

function setupDropZone(onDataLoaded) {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (!dropZone || !fileInput) return;

  // Clic sur la zone → déclenche l'input file caché
  dropZone.addEventListener('click', () => fileInput.click());

  // Glisser-déposer
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.xlsx')) {
      setSelectedFile(file);
    } else {
      showToast('Veuillez déposer un fichier .xlsx', 'error');
    }
  });

  // Sélection via le bouton "Parcourir"
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  });
}

/**
 * Met à jour l'UI quand un fichier est sélectionné.
 * @param {File} file
 */
function setSelectedFile(file) {
  const filenameEl = document.getElementById('drop-filename');
  const uploadBtn  = document.getElementById('upload-btn');

  if (filenameEl) {
    filenameEl.textContent = '✓ ' + file.name;
    filenameEl.style.display = 'block';
  }

  if (uploadBtn) uploadBtn.disabled = false;

  // Stocke le fichier pour le bouton "Charger"
  document.getElementById('drop-zone')._selectedFile = file;
}


// ─────────────────────────────────────────────────────────────────────────────
// BOUTON "CHARGER LE FICHIER"
// ─────────────────────────────────────────────────────────────────────────────

function setupUploadBtn(onDataLoaded) {
  const btn = document.getElementById('upload-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const dropZone = document.getElementById('drop-zone');
    const file     = dropZone?._selectedFile;

    // Vérifie aussi l'input file direct
    const fileInput = document.getElementById('file-input');
    const fileToUse = file || fileInput?.files?.[0];

    if (!fileToUse) {
      showToast('Veuillez sélectionner un fichier .xlsx', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Chargement...';
    showToast('Lecture du fichier en cours...', '');

    try {
      const buffer = await fileToUse.arrayBuffer();
      const data   = parseXLSX(buffer);

      if (!data.songs.length) {
        throw new Error('Aucune chanson trouvée. Vérifiez les noms des feuilles (Entrée, S-E, Louange, Adoration).');
      }

      onDataLoaded(data);

    } catch (err) {
      console.error('[Setup] Erreur fichier XLSX :', err);
      showToast('Erreur : ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Charger le fichier →';
    }
  });
}

function setupDefaultDataBtn(onDataLoaded) {
  const btn = document.getElementById('default-data-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '⏳ Chargement des données par défaut...';
    showToast('Chargement du fichier par défaut...', '');

    try {
      const response = await fetch(encodeURI(DEFAULT_XLSX_PATH));
      if (!response.ok) throw new Error(`Impossible de charger le fichier par défaut (HTTP ${response.status}).`);

      const buffer = await response.arrayBuffer();
      const data   = parseXLSX(buffer);

      if (!data.songs.length) {
        throw new Error('Aucune chanson trouvée dans le fichier par défaut.');
      }

      onDataLoaded(data);

    } catch (err) {
      console.error('[Setup] Erreur chargement par défaut :', err);
      const isFileProtocol = window.location.protocol === 'file:';
      const msg = isFileProtocol
        ? 'Impossible de charger le fichier par défaut en mode file://. Lancez un serveur local (ex: Live Server).'
        : err.message;
      showToast('Erreur : ' + msg, 'error');
      btn.disabled = false;
      btn.textContent = 'Utiliser les données par défaut (dossier data) →';
    }
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// BOUTON "CONNECTER GOOGLE SHEETS"
// ─────────────────────────────────────────────────────────────────────────────

function setupSheetsBtn(onDataLoaded) {
  const btn = document.getElementById('sheets-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const spreadsheetId = document.getElementById('sheets-id')?.value.trim();

    if (!spreadsheetId) {
      showToast('Veuillez entrer l\'ID du Google Sheet', 'error');
      return;
    }

    // Collecte tous les GIDs configurés
    const gids = {
      'Entrée':           document.getElementById('gid-entree')?.value.trim(),
      'S-E':              document.getElementById('gid-se')?.value.trim(),
      'Louange':          document.getElementById('gid-louange')?.value.trim(),
      'Adoration':        document.getElementById('gid-adoration')?.value.trim(),
      'Progression Blank':document.getElementById('gid-prog')?.value.trim(),
      'Report sheet':     document.getElementById('gid-report')?.value.trim(),
      'Vocal Range':      document.getElementById('gid-vocal-range')?.value.trim(),
      'Groupes vocal':    document.getElementById('gid-groupes')?.value.trim(),
      'Taches':           document.getElementById('gid-taches')?.value.trim(),
    };

    // Vérifie que les 4 feuilles obligatoires ont un GID
    const required = ['Entrée', 'S-E', 'Louange', 'Adoration'];
    const missing  = required.filter(name => !gids[name]);
    if (missing.length) {
      showToast(`GIDs manquants : ${missing.join(', ')}`, 'error');
      return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ Connexion...';
    showToast('Connexion à Google Sheets...', '');

    try {
      const data = await parseGoogleSheets(spreadsheetId, gids);

      if (!data.songs.length) {
        throw new Error('Aucune chanson trouvée. Vérifiez que le Sheet est publié et que les GIDs sont corrects.');
      }

      onDataLoaded(data);

    } catch (err) {
      console.error('[Setup] Erreur Google Sheets :', err);
      showToast('Erreur : ' + err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Connecter Google Sheets →';
    }
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// BOUTON "CONTINUER AVEC LE CACHE"
// ─────────────────────────────────────────────────────────────────────────────

function setupCacheBtn(onDataLoaded) {
  const btn = document.getElementById('cache-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const data = loadFromCache();
    if (!data || !data.songs?.length) {
      showToast('Aucune donnée en cache. Chargez d\'abord un fichier.', 'error');
      return;
    }
    showToast(`${data.songs.length} chansons restaurées depuis le cache ✓`, 'success');
    onDataLoaded(data);
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION FORMULAIRE GOOGLE SHEETS
// Active/désactive le bouton selon les champs requis remplis
// ─────────────────────────────────────────────────────────────────────────────

function setupSheetsValidation() {
  const requiredIds = ['sheets-id', 'gid-entree', 'gid-se', 'gid-louange', 'gid-adoration'];
  const btn = document.getElementById('sheets-btn');
  if (!btn) return;

  const validate = () => {
    const allFilled = requiredIds.every(id => {
      const el = document.getElementById(id);
      return el && el.value.trim().length > 0;
    });
    btn.disabled = !allFilled;
  };

  requiredIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validate);
  });
}
