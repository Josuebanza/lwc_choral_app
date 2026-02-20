/**
 * UTILS.JS — Fonctions utilitaires partagées
 *
 * Fonctions pures (sans effets de bord sur le state) utilisées
 * dans plusieurs vues : formatage, pagination, toast, échappement HTML.
 */


// ─────────────────────────────────────────────────────────────────────────────
// SÉCURITÉ — Échappement HTML
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Échappe les caractères spéciaux HTML pour prévenir les injections XSS.
 * À utiliser sur tout contenu provenant des données avant insertion dans innerHTML.
 *
 * @param {*} str - Valeur à échapper (sera convertie en string)
 * @returns {string} - Chaîne sécurisée pour insertion dans innerHTML
 */
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}


// ─────────────────────────────────────────────────────────────────────────────
// FORMATAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO (YYYY-MM-DD) en format lisible français.
 * Ex: "2025-01-15" → "15 janv. 2025"
 *
 * @param {string|null} dateStr - Date ISO ou null
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00'); // force UTC midnight
    return d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Retourne le nombre de jours entre une date et aujourd'hui.
 * @param {string} dateStr - Date ISO
 * @returns {number}
 */
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now - d) / 86_400_000);
}


// ─────────────────────────────────────────────────────────────────────────────
// TOAST (notification temporaire)
// ─────────────────────────────────────────────────────────────────────────────

let _toastTimer = null;

/**
 * Affiche une notification temporaire en bas à droite de l'écran.
 *
 * @param {string} message - Texte du message
 * @param {'success'|'error'|''} type - Type de notification
 * @param {number} duration - Durée d'affichage en ms (défaut : 3500)
 */
export function showToast(message, type = '', duration = 3500) {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.className = `toast show${type ? ' ' + type : ''}`;

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}


// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère la liste des numéros de pages à afficher (avec ellipses).
 * Ex: pour page=5 sur 12 → [1, '…', 4, 5, 6, '…', 12]
 *
 * @param {number} page - Page courante
 * @param {number} total - Nombre total de pages
 * @returns {Array<number|string>}
 */
function getPageRange(page, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (page <= 4)        return [1, 2, 3, 4, 5, '…', total];
  if (page >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', page-1, page, page+1, '…', total];
}

/**
 * Injecte le HTML de pagination dans un conteneur DOM.
 *
 * @param {string}   containerId - ID de l'élément conteneur
 * @param {number}   totalItems  - Nombre total d'éléments
 * @param {number}   page        - Page courante
 * @param {number}   perPage     - Éléments par page
 * @param {Function} onChange    - Callback appelé avec le nouveau numéro de page
 */
export function renderPagination(containerId, totalItems, page, perPage, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / perPage);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(page * perPage, totalItems);
  const range = getPageRange(page, totalPages);

  // Construction des boutons de page
  let btns = '';
  btns += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page-1}">‹</button>`;

  range.forEach(p => {
    if (p === '…') {
      btns += `<span style="color:var(--text3);padding:0 0.2rem;line-height:2;">…</span>`;
    } else {
      btns += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  btns += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page+1}">›</button>`;

  container.innerHTML = `
    <span class="pagination-info">${start}–${end} sur ${totalItems}</span>
    <div class="pagination-btns">${btns}</div>`;

  // Écouteur délégué sur les boutons de page
  container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p)) onChange(p);
    });
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DIVERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise un nom pour la comparaison (minuscules, espaces normalisés).
 * Ex: "Maman\nAnnie" → "maman annie"
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Cherche une clé dans un objet dont le nom normalisé correspond au nom donné.
 * Utilisé pour faire correspondre les noms entre feuilles.
 *
 * @param {Object} obj - Dictionnaire à chercher
 * @param {string} name - Nom à trouver
 * @returns {string|null} - Clé trouvée ou null
 */
export function findKeyByName(obj, name) {
  const target = normalizeName(name);
  return Object.keys(obj).find(k => normalizeName(k) === target) || null;
}

const PERSON_NAME_ALIASES = {
  voldie: 'voldis',
  voldis: 'voldis',
  maannie: 'mamanannie',
  mamanannie: 'mamanannie',
};

/**
 * Normalise un nom de personne pour comparer des variantes inter-feuilles.
 * Ex: "Ma'Annie" -> "mamanannie", "Voldie" -> "voldis"
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizePersonName(name) {
  const base = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return PERSON_NAME_ALIASES[base] || base;
}

/**
 * Compare deux noms de personnes de façon tolérante.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function arePersonNamesEquivalent(a, b) {
  const an = normalizePersonName(a);
  const bn = normalizePersonName(b);
  if (!an || !bn) return false;
  if (an === bn) return true;

  const aFirst = normalizePersonName(String(a || '').trim().split(/\s+/)[0]);
  const bFirst = normalizePersonName(String(b || '').trim().split(/\s+/)[0]);

  if (!aFirst || !bFirst) return false;
  return aFirst === bFirst || aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst);
}

/**
 * Cherche une clé de dictionnaire correspondant à un nom de personne.
 * Utilise la normalisation "personne" + fallback sur le prénom.
 *
 * @param {Object} obj
 * @param {string} name
 * @returns {string|null}
 */
export function findPersonKeyByName(obj, name) {
  const keys = Object.keys(obj || {});
  const target = normalizePersonName(name);

  const direct = keys.find(k => normalizePersonName(k) === target);
  if (direct) return direct;

  const nameFirst = String(name || '').trim().split(/\s+/)[0] || '';
  const first = keys.find(k => {
    const kFirst = String(k || '').trim().split(/\s+/)[0] || '';
    return arePersonNamesEquivalent(kFirst, nameFirst);
  });

  return first || null;
}
