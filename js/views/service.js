/**
 * VIEWS/SERVICE.JS — Vue Planification de Service
 *
 * Affiche le répertoire par section du culte (Entrée / S-E / Louange / Adoration)
 * avec filtres, recherche et pagination.
 */

import { state }                    from '../state.js';
import { SECTION_CSS, PER_PAGE }    from '../config.js';
import { esc, formatDate, renderPagination } from '../utils.js';


/** Initialise les écouteurs et les onglets. Appelée une fois depuis main.js. */
export function initServiceView() {
  // Onglets de section
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      if (!section) return;
      state.serviceSection = section;
      state.servicePage    = 1;

      // Met à jour l'état actif des onglets
      document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      renderServiceTable();
    });
  });

  // Filtres
  ['service-search','service-langue','service-member','service-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  resetAndRender);
    el.addEventListener('change', resetAndRender);
  });
}

function resetAndRender() {
  state.servicePage = 1;
  renderServiceTable();
}

/**
 * Peuple le select "Filtrer par membre" avec les chanteurs.
 * Appelée depuis main.js après le chargement des données.
 */
export function populateMemberFilter() {
  const sel = document.getElementById('service-member');
  if (!sel) return;

  // Garde seulement l'option "Tous"
  while (sel.options.length > 1) sel.remove(1);

  // Ajoute les chanteurs (ceux qui ont des tonalités dans les chansons)
  const singers = [...new Set(
    state.songs.flatMap(s => Object.keys(s.memberKeys))
  )].sort();

  singers.forEach(name => {
    const opt = document.createElement('option');
    opt.value       = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}


/** Rend la table de la section active. */
export function renderServiceTable() {
  const songs = getFilteredServiceSongs();
  const page  = state.servicePage;
  const per   = state.PER_PAGE || PER_PAGE;
  const slice = songs.slice((page-1)*per, page*per);

  document.getElementById('service-results-info').textContent =
    `${songs.length} chanson(s) dans ${state.serviceSection}`;

  document.getElementById('service-tbody').innerHTML = slice.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text3);">Aucune chanson trouvée</td></tr>`
    : slice.map(serviceRow).join('');

  renderPagination('service-pagination', songs.length, page, per, p => {
    state.servicePage = p;
    renderServiceTable();
  });
}

function serviceRow(s) {
  const lng = s.langue.toLowerCase().replace('/', '') || '—';
  return `
    <tr class="clickable-row" onclick="window._openModal('${s.id}')">
      <td><div class="cell-title">${esc(s.title)}</div></td>
      <td><span class="badge badge-${lng}">${s.langue}</span></td>
      <td style="font-weight:600;color:var(--accent);">${esc(s.originalKey) || '—'}</td>
      <td style="color:var(--text2);font-size:0.82rem;">${s.lastSang ? formatDate(s.lastSang) : '—'}</td>
      <td style="color:var(--text3);">${s.daysPast != null ? s.daysPast+'j' : '—'}</td>
      <td>${s.hasProgression ? '<span class="badge badge-yes">✓</span>' : '<span class="badge badge-no">—</span>'}</td>
      <td style="color:var(--text2);font-size:0.82rem;">${esc(s.creuSommet) || '—'}</td>
    </tr>`;
}

function getFilteredServiceSongs() {
  const search  = (document.getElementById('service-search')?.value  || '').toLowerCase();
  const langue  = document.getElementById('service-langue')?.value   || '';
  const member  = document.getElementById('service-member')?.value   || '';
  const sort    = document.getElementById('service-sort')?.value     || 'title';

  let songs = state.songs.filter(s => {
    if (s.section !== state.serviceSection)               return false;
    if (search && !s.title.toLowerCase().includes(search)) return false;
    if (langue && s.langue !== langue)                     return false;
    if (member && !s.memberKeys[member])                   return false;
    return true;
  });

  songs.sort((a, b) => {
    if (sort === 'title')      return a.title.localeCompare(b.title);
    if (sort === 'days-asc')   return (a.daysPast ?? 9999) - (b.daysPast ?? 9999);
    if (sort === 'days-desc')  return (b.daysPast ?? 0)    - (a.daysPast ?? 0);
    return 0;
  });

  return songs;
}
