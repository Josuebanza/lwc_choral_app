/**
 * VIEWS/SONGS.JS — Vue Chansons
 * Table paginée avec recherche + filtres multiples.
 */

import { state }                from '../state.js';
import { SECTION_CSS, PER_PAGE } from '../config.js';
import { esc, formatDate, renderPagination } from '../utils.js';


/** Initialise les écouteurs de filtres. Appelée une fois depuis main.js. */
export function initSongsView() {
  ['songs-search','songs-section','songs-langue','songs-prog','songs-lyrics','songs-sort']
    .forEach(id => {
      document.getElementById(id)?.addEventListener('input',  resetAndRender);
      document.getElementById(id)?.addEventListener('change', resetAndRender);
    });
}

function resetAndRender() {
  state.songsPage = 1;
  renderSongsTable();
}

/** Rend la table des chansons avec les filtres actifs. */
export function renderSongsTable() {
  const songs = getFilteredSongs();
  const page  = state.songsPage;
  const per   = state.PER_PAGE || PER_PAGE;
  const slice = songs.slice((page-1)*per, page*per);

  document.getElementById('songs-count').textContent =
    `${state.songs.length} chansons dans le répertoire`;

  document.getElementById('songs-results-info').textContent =
    songs.length === state.songs.length
      ? `${songs.length} chansons`
      : `${songs.length} résultats sur ${state.songs.length}`;

  const tbody = document.getElementById('songs-tbody');
  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="8" class="empty-state"><div class="empty-text">Aucune chanson trouvée</div></td></tr>`
    : slice.map(songRow).join('');

  renderPagination('songs-pagination', songs.length, page, per, p => {
    state.songsPage = p;
    renderSongsTable();
  });
}

function songRow(s) {
  const sc  = SECTION_CSS[s.section] || 'entree';
  const lng = s.langue.toLowerCase().replace('/', '') || '—';
  return `
    <tr class="clickable-row" onclick="window._openModal('${s.id}')">
      <td><div class="cell-title">${esc(s.title)}</div></td>
      <td><span class="badge badge-${sc}">${s.section}</span></td>
      <td><span class="badge badge-${lng}">${s.langue}</span></td>
      <td style="font-weight:600;color:var(--accent);">${esc(s.originalKey) || '—'}</td>
      <td style="color:var(--text2);font-size:0.82rem;">${s.lastSang ? formatDate(s.lastSang) : '—'}</td>
      <td style="color:var(--text3);">${s.daysPast != null ? s.daysPast+'j' : '—'}</td>
      <td>${s.hasLyrics     ? '<span class="badge badge-yes">✓</span>' : '<span class="badge badge-no">—</span>'}</td>
      <td>${s.hasProgression ? '<span class="badge badge-yes">✓</span>' : '<span class="badge badge-no">—</span>'}</td>
    </tr>`;
}

function getFilteredSongs() {
  const search  = (document.getElementById('songs-search')?.value  || '').toLowerCase();
  const section = document.getElementById('songs-section')?.value  || '';
  const langue  = document.getElementById('songs-langue')?.value   || '';
  const prog    = document.getElementById('songs-prog')?.value     || '';
  const lyrics  = document.getElementById('songs-lyrics')?.value   || '';
  const sort    = document.getElementById('songs-sort')?.value     || 'title';

  let songs = state.songs.filter(s => {
    if (search && !s.title.toLowerCase().includes(search)) return false;
    if (section && s.section !== section)                   return false;
    if (langue  && s.langue  !== langue)                    return false;
    if (prog === 'yes' && !s.hasProgression)                return false;
    if (prog === 'no'  &&  s.hasProgression)                return false;
    if (lyrics === 'yes' && !s.hasLyrics)                   return false;
    if (lyrics === 'no'  &&  s.hasLyrics)                   return false;
    return true;
  });

  songs.sort((a, b) => {
    if (sort === 'title')      return a.title.localeCompare(b.title);
    if (sort === 'days-asc')   return (a.daysPast ?? 9999) - (b.daysPast ?? 9999);
    if (sort === 'days-desc')  return (b.daysPast ?? 0)    - (a.daysPast ?? 0);
    if (sort === 'section')    return a.section.localeCompare(b.section);
    return 0;
  });

  return songs;
}
