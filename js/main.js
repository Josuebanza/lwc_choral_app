/**
 * MAIN.JS — Point d'entrée de l'application
 *
 * Responsabilités :
 *  1. Initialiser les modules (setup, modal, vues)
 *  2. Gérer la navigation entre les vues
 *  3. Lancer l'app une fois les données chargées
 *  4. Exposer les fonctions globales nécessaires aux handlers HTML onclick
 *     (nécessaire car les modules ES6 ne pollue pas le scope global)
 */

import { initSetup }                              from './setup.js';
import { initModal, openSongModal }               from './modal.js';
import { setData, state, resetState }             from './state.js';
import { showToast }                              from './utils.js';
import { renderDashboard }                        from './views/dashboard.js';
import { initSongsView, renderSongsTable }        from './views/songs.js';
import { initMembersView, renderMemberCards,
         selectMember, renderMemberDetail }       from './views/members.js';
import { initServiceView, renderServiceTable,
         populateMemberFilter }                   from './views/service.js';
import { SINGERS, AVATAR_COLORS }                 from './config.js';
import { normalizePersonName }                    from './utils.js';
import { initPWA }                                from './pwa.js';


// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Modules statiques (ne dépendent pas des données)
  initModal();
  initSongsView();
  initMembersView();
  initServiceView();
  initPWA();

  // Écouteurs de navigation sidebar
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => showView(item.dataset.view));
  });

  // Bouton "Changer de source"
  document.getElementById('reset-btn')?.addEventListener('click', resetApp);

  // Setup — appelé en dernier (peut déclencher launchApp si données chargées)
  initSetup(launchApp);
});


// ─────────────────────────────────────────────────────────────────────────────
// LANCEMENT DE L'APP APRÈS CHARGEMENT DES DONNÉES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appelée par setup.js une fois les données parsées et validées.
 * Charge les données dans le state, construit les membres manquants,
 * puis affiche l'interface principale.
 *
 * @param {Object} data - Données parsées par parser.js
 */
function launchApp(data) {
  // ── Charge les données dans le state global ──
  setData(data);

  // ── Complète la liste des membres si absents du Report sheet ──
  // Les chanteurs identifiés via les colonnes "Key" du XLSX
  SINGERS.forEach(name => {
    const hasSongs = state.songs.some(s => s.memberKeys[name]);
    if (hasSongs && !state.members.find(m => normalizePersonName(m.name) === normalizePersonName(name))) {
      state.members.push({ name, role: 'Chanteur·se' });
    }
  });

  // Les chanteurs trouvés dans la feuille "Vocal Range"
  Object.keys(state.vocalRanges || {}).forEach(name => {
    if (!state.members.find(m => normalizePersonName(m.name) === normalizePersonName(name))) {
      state.members.push({ name, role: 'Chanteur·se' });
    }
  });

  // Les musiciens identifiés via les colonnes "Piano / Drum / Bass / Guitar"
  const musiciansFound = new Set(
    state.songs.flatMap(s => Object.keys(s.musicians).map(k => k.split(' ')[0]))
  );
  musiciansFound.forEach(mName => {
    if (!state.members.find(m => normalizePersonName(m.name) === normalizePersonName(mName))) {
      state.members.push({ name: mName, role: 'Musicien·ne' });
    }
  });

  // ── Peuple les filtres dépendants des données ──
  populateMemberFilter();

  // ── Bascule l'UI ──
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.body.classList.add('app-open');

  // ── Affiche la vue initiale ──
  showView('dashboard');

  showToast(`${state.songs.length} chansons chargées ✓`, 'success');
}


// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Active une vue (page) et met à jour la sidebar.
 * @param {'dashboard'|'songs'|'members'|'service'} view
 */
function showView(view) {
  state.currentView = view;

  // Affiche la bonne page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${view}`)?.classList.add('active');

  // Met à jour l'item actif dans la sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  // Rend la vue selon laquelle est sélectionnée
  switch (view) {
    case 'dashboard': renderDashboard();   break;
    case 'songs':
      state.songsPage = 1;
      renderSongsTable();
      break;
    case 'members':
      renderMemberCards();
      break;
    case 'service':
      state.servicePage = 1;
      renderServiceTable();
      break;
  }
}

/**
 * Ouvre la vue Chansons et applique des filtres avant rendu.
 * @param {{ section?: string, langue?: string }} filters
 */
function goToSongsWithFilters(filters = {}) {
  const sectionEl = document.getElementById('songs-section');
  const langueEl  = document.getElementById('songs-langue');
  const searchEl  = document.getElementById('songs-search');
  const progEl    = document.getElementById('songs-prog');
  const lyricsEl  = document.getElementById('songs-lyrics');
  const sortEl    = document.getElementById('songs-sort');

  if (sectionEl) sectionEl.value = filters.section || '';
  if (langueEl)  langueEl.value  = filters.langue || '';
  if (searchEl)  searchEl.value  = '';
  if (progEl)    progEl.value    = '';
  if (lyricsEl)  lyricsEl.value  = '';
  if (sortEl)    sortEl.value    = 'title';

  showView('songs');
}


// ─────────────────────────────────────────────────────────────────────────────
// RESET — Retour à l'écran de configuration
// ─────────────────────────────────────────────────────────────────────────────

function resetApp() {
  resetState();

  document.getElementById('app').classList.remove('visible');
  document.getElementById('setup-screen').style.display = 'flex';
  document.body.classList.remove('app-open');
}


// ─────────────────────────────────────────────────────────────────────────────
// BRIDGE GLOBAL — Expose les fonctions aux handlers HTML inline
// ─────────────────────────────────────────────────────────────────────────────
// Les modules ES6 ne pollue pas window. Pour que les onclick="..." dans le HTML
// généré dynamiquement fonctionnent, on expose les fonctions nécessaires ici.

window._openModal = (songId) => openSongModal(songId);

window._selectMember = (name) => {
  selectMember(name);
};

window._memberSearch = () => {
  state.memberSongsPage = 1;
  if (state.selectedMember) renderMemberDetail(state.selectedMember);
};

window._goSongsWithFilters = (filters) => {
  goToSongsWithFilters(filters || {});
};
