/**
 * MODAL.JS — Modal de détail d'une chanson
 *
 * Affiche une fenêtre modale avec toutes les informations d'une chanson :
 *  - Métadonnées (date, jours, langue, tonalité originale)
 *  - Tonalités par membre
 *  - Musiciens assignés
 *  - Progression d'accords
 */

import { state }                         from './state.js';
import { SECTION_CSS, MUSICIAN_LABELS }  from './config.js';
import { esc, formatDate, findKeyByName } from './utils.js';


// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialise les écouteurs du modal (fermeture au clic extérieur / touche Echap).
 * Appelée une seule fois depuis main.js.
 */
export function initModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  // Ferme le modal en cliquant sur l'overlay (fond semi-transparent)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  // Ferme le modal avec la touche Échap
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Bouton × de fermeture
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
}


// ─────────────────────────────────────────────────────────────────────────────
// OUVRIR LE MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ouvre le modal avec les données de la chanson identifiée par son ID.
 *
 * @param {string} songId - ID unique de la chanson (ex: "Entrée_2")
 */
export function openSongModal(songId) {
  const song = state.songs.find(s => s.id === songId);
  if (!song) {
    console.warn('[Modal] Chanson introuvable :', songId);
    return;
  }

  // ── Titre et badges ──
  document.getElementById('modal-title').textContent = song.title;

  const sc = SECTION_CSS[song.section] || 'entree';
  const langCls = song.langue.toLowerCase().replace('/', '') || '—';

  document.getElementById('modal-badges').innerHTML = `
    <span class="badge badge-${sc}">${esc(song.section)}</span>
    <span class="badge badge-${langCls}">${esc(song.langue)}</span>
    ${song.originalKey
      ? `<span class="badge" style="background:rgba(201,168,76,0.15);color:var(--accent);">🎵 ${esc(song.originalKey)}</span>`
      : ''}
    ${song.hasLyrics     ? '<span class="badge badge-yes">Paroles ✓</span>'     : ''}
    ${song.hasProgression ? '<span class="badge badge-yes">Progression ✓</span>' : ''}`;

  // ── Corps du modal ──
  document.getElementById('modal-body').innerHTML = buildModalBody(song);

  // Ouvre le modal
  document.getElementById('modal-overlay').classList.add('open');

  // Empêche le scroll du fond pendant l'ouverture
  document.body.style.overflow = 'hidden';
}

/**
 * Ferme le modal.
 */
export function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}


// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION DU CORPS DU MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère le HTML du corps du modal pour une chanson donnée.
 * @param {Object} song
 * @returns {string} HTML
 */
function buildModalBody(song) {
  const sections = [];

  // ── 1. Informations générales ──
  sections.push(`
    <div class="modal-section">
      <div class="modal-section-title">Informations générales</div>
      <div class="meta-grid">
        ${metaItem('Dernière fois', formatDate(song.lastSang))}
        ${metaItem('Jours passés', song.daysPast != null ? song.daysPast + 'j' : '—')}
        ${metaItem('Creu & Sommet', song.creuSommet || '—')}
        ${metaItem('Tonalité originale', song.originalKey || '—', 'var(--accent)', '600')}
        ${metaItem('Section', song.section)}
        ${metaItem('Langue', song.langue)}
      </div>
    </div>`);

  // ── 2. Tonalités par membre ──
  const memberEntries = Object.entries(song.memberKeys);
  sections.push(`
    <div class="modal-section">
      <div class="modal-section-title">Tonalités par membre (${memberEntries.length})</div>
      ${memberEntries.length > 0
        ? `<div class="keys-grid">
            ${memberEntries.map(([member, key]) => `
              <div class="key-item">
                <span class="key-item-name">${esc(member)}</span>
                <span class="key-item-value">${esc(key)}</span>
              </div>`).join('')}
           </div>`
        : '<p style="color:var(--text3);font-size:0.85rem;">Aucune tonalité assignée</p>'}`);
  sections.push('</div>');

  // ── 3. Musiciens assignés ──
  const assignedMusicians = Object.entries(song.musicians)
    .filter(([, assigned]) => assigned)
    .map(([key]) => MUSICIAN_LABELS[key] || key);

  sections.push(`
    <div class="modal-section">
      <div class="modal-section-title">Musiciens assignés</div>
      ${assignedMusicians.length > 0
        ? `<div class="musician-chips">
            ${assignedMusicians.map(label => `
              <span class="musician-chip assigned">${esc(label)}</span>`).join('')}
           </div>`
        : '<p style="color:var(--text3);font-size:0.85rem;">Aucun musicien assigné</p>'}
    </div>`);

  // ── 4. Progression d'accords ──
  const progKey = findKeyByName(state.progressions, song.title);
  const progression = progKey ? state.progressions[progKey] : null;

  if (progression) {
    sections.push(`
      <div class="modal-section">
        <div class="modal-section-title">Progression d'accords</div>
        <div class="progression-block">${esc(progression)}</div>
      </div>`);
  }

  return sections.join('');
}

/**
 * Génère une carte de méta-information.
 * @param {string} label
 * @param {string} value
 * @param {string} color - Couleur CSS optionnelle pour la valeur
 * @param {string} fontWeight - Font weight optionnel
 * @returns {string} HTML
 */
function metaItem(label, value, color = 'var(--text2)', fontWeight = '400') {
  return `
    <div class="meta-item">
      <div class="meta-item-label">${esc(label)}</div>
      <div class="meta-item-value" style="color:${color};font-weight:${fontWeight};">${esc(value)}</div>
    </div>`;
}
