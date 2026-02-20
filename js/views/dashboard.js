/**
 * VIEWS/DASHBOARD.JS — Vue Dashboard
 *
 * Affiche :
 *  - Statistiques globales (chansons, membres, progressions, langues)
 *  - Panneau "Chantées récemment"
 *  - Panneau "Non chantées depuis longtemps"
 *  - Répartition par section (barres)
 *  - Répartition par langue (barres)
 */

import { state }          from '../state.js';
import { SECTION_CSS, LANGUE_LABELS } from '../config.js';
import { esc, formatDate } from '../utils.js';
import { openSongModal }  from '../modal.js';


/**
 * Point d'entrée : rend toute la vue Dashboard.
 * Appelée par main.js à chaque activation de la vue.
 */
export function renderDashboard() {
  renderStats();
  renderRecentSongs();
  renderOldSongs();
  renderSectionDist();
  renderLangDist();

  // Met à jour le sous-titre de la page
  document.getElementById('dash-subtitle').textContent =
    `${state.songs.length} chansons · ${state.members.length} membres · ${new Date().toLocaleDateString('fr-CA')}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// STATISTIQUES GLOBALES
// ─────────────────────────────────────────────────────────────────────────────

function renderStats() {
  const songs    = state.songs;
  const withProg = songs.filter(s => s.hasProgression).length;
  const withLyr  = songs.filter(s => s.hasLyrics).length;

  const stats = [
    { val: songs.length,                         label: 'Chansons totales',  sub: 'Toutes sections' },
    { val: state.members.length,                  label: 'Membres',          sub: 'Chanteurs & musiciens' },
    { val: withProg, label: 'Avec progression', sub: `${pct(withProg, songs.length)}% du répertoire` },
    { val: withLyr,  label: 'Avec paroles',     sub: `${pct(withLyr,  songs.length)}% du répertoire` },
    { val: songs.filter(s => s.langue === 'FR').length,   label: 'En Français', sub: '' },
    { val: songs.filter(s => s.langue === 'ENG').length,  label: 'En Anglais',  sub: '' },
    { val: songs.filter(s => s.langue === 'LNGL').length, label: 'En Lingala',  sub: '' },
  ];

  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
      ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
    </div>`).join('');
}


// ─────────────────────────────────────────────────────────────────────────────
// PANNEAUX DE CHANSONS
// ─────────────────────────────────────────────────────────────────────────────

function renderRecentSongs() {
  const songs = state.songs
    .filter(s => s.lastSang)
    .sort((a, b) => new Date(b.lastSang) - new Date(a.lastSang))
    .slice(0, 8);

  document.getElementById('recent-songs').innerHTML = songs.length
    ? songs.map(s => songPanelItem(s, 'recent')).join('')
    : emptyPanel('Aucune date de passage disponible');
}

function renderOldSongs() {
  const songs = state.songs
    .filter(s => s.lastSang)
    .sort((a, b) => new Date(a.lastSang) - new Date(b.lastSang))
    .slice(0, 8);

  document.getElementById('old-songs').innerHTML = songs.length
    ? songs.map(s => songPanelItem(s, 'old')).join('')
    : emptyPanel('Aucune date de passage disponible');
}

/**
 * Génère le HTML d'un élément dans un panneau de chansons.
 * @param {Object} song
 * @param {'recent'|'old'} panelType
 */
function songPanelItem(song, panelType) {
  const days = song.daysPast ?? Math.floor((Date.now() - new Date(song.lastSang)) / 86_400_000);
  let badgeCls = '';
  if (panelType === 'recent') badgeCls = 'recent';
  else if (days > 180) badgeCls = 'urgent';

  const badgeContent = panelType === 'recent'
    ? formatDate(song.lastSang)
    : `${days}j`;

  return `
    <div class="panel-item clickable-row" onclick="window._openModal('${song.id}')">
      <div>
        <div class="panel-item-title">${esc(song.title)}</div>
        <div class="panel-item-sub">${song.section} · ${song.langue}</div>
      </div>
      <div class="days-badge ${badgeCls}">${badgeContent}</div>
    </div>`;
}


// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTIONS
// ─────────────────────────────────────────────────────────────────────────────

function renderSectionDist() {
  const sections = ['Entrée', 'S-E', 'Louange', 'Adoration'];
  const total = state.songs.length;

  document.getElementById('section-dist').innerHTML = sections.map(sec => {
    const count = state.songs.filter(s => s.section === sec).length;
    const pc    = pct(count, total);
    const cls   = SECTION_CSS[sec] || 'entree';

    return `
      <div class="panel-item clickable-row" onclick="window._goSongsWithFilters({ section: '${sec}' })">
        <div class="panel-item-title">
          <span class="badge badge-${cls}">${sec}</span>
        </div>
        <div class="dist-bar-wrap">
          <div class="dist-bar">
            <div class="dist-bar-fill" style="width:${pc}%;background:var(--${cls});"></div>
          </div>
          <span class="dist-count">${count}</span>
        </div>
      </div>`;
  }).join('');
}

function renderLangDist() {
  const langs = ['FR', 'ENG', 'LNGL', '—'];
  const total = state.songs.length;

  document.getElementById('lang-dist').innerHTML = langs.map(lang => {
    const count = state.songs.filter(s => s.langue === lang).length;
    if (!count) return '';
    const pc = pct(count, total);

    return `
      <div class="panel-item clickable-row" onclick="window._goSongsWithFilters({ langue: '${lang}' })">
        <div class="panel-item-title">${LANGUE_LABELS[lang] || lang}</div>
        <div class="dist-bar-wrap">
          <div class="dist-bar">
            <div class="dist-bar-fill" style="width:${pc}%;background:var(--accent);"></div>
          </div>
          <span class="dist-count">${count}</span>
        </div>
      </div>`;
  }).join('');
}


// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES INTERNES
// ─────────────────────────────────────────────────────────────────────────────

function pct(part, total) {
  if (!total) return 0;
  return Math.round(part / total * 100);
}

function emptyPanel(msg) {
  return `<div class="empty-state"><div class="empty-text">${msg}</div></div>`;
}
