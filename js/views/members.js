/**
 * VIEWS/MEMBERS.JS — Vue Membres
 *
 * Affiche les cartes de membres et, au clic, le profil complet avec :
 *  - Tessiture vocale (Vocal Range)
 *  - Groupes vocaux / rôles d'harmonie
 *  - Tâches assignées
 *  - Liste paginée des chansons avec tonalités
 */

import { state }                    from '../state.js';
import { SECTION_CSS, AVATAR_COLORS, PER_PAGE } from '../config.js';
import { esc, renderPagination, findKeyByName } from '../utils.js';


/** Initialise les écouteurs. Appelée une fois depuis main.js. */
export function initMembersView() {
  document.getElementById('member-filter')?.addEventListener('input', renderMemberCards);
}

/** Rend la grille de cartes membres. */
export function renderMemberCards() {
  const search  = (document.getElementById('member-filter')?.value || '').toLowerCase();
  const members = state.members.filter(m =>
    !search || m.name.toLowerCase().includes(search)
  );

  document.getElementById('members-grid').innerHTML = members.map((m, idx) => {
    const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    const songCount = state.songs.filter(s => s.memberKeys[m.name]).length;
    const isSelected = state.selectedMember === m.name;

    return `
      <div class="member-card ${isSelected ? 'selected' : ''}"
           onclick="window._selectMember('${esc(m.name)}')">
        <div class="member-avatar"
             style="background:${color}22;color:${color};border:2px solid ${color}44;">
          ${m.name[0]}
        </div>
        <div class="member-name">${esc(m.name)}</div>
        <div class="member-role">${esc(m.role || 'Membre')}</div>
        <div class="member-song-count"><span>${songCount}</span> chansons</div>
      </div>`;
  }).join('');

  // Re-rend le détail si un membre est sélectionné
  if (state.selectedMember) renderMemberDetail(state.selectedMember);
}

/** Sélectionne / désélectionne un membre. */
export function selectMember(name) {
  state.selectedMember  = state.selectedMember === name ? null : name;
  state.memberSongsPage = 1;
  renderMemberCards();

  // Scrolle vers le détail si un membre est sélectionné
  if (state.selectedMember) {
    setTimeout(() => {
      document.getElementById('member-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// RENDU DU PROFIL MEMBRE
// ─────────────────────────────────────────────────────────────────────────────

export function renderMemberDetail(name) {
  const container = document.getElementById('member-detail');
  if (!name || !state.selectedMember) { container.innerHTML = ''; return; }

  const member   = state.members.find(m => m.name === name) || { name, role: 'Membre' };
  const memberIdx = state.members.indexOf(member);
  const color    = AVATAR_COLORS[memberIdx >= 0 ? memberIdx % AVATAR_COLORS.length : 0];

  // Toutes les chansons liées à ce membre
  const allMemberSongs = state.songs.filter(s =>
    s.memberKeys[name] || Object.keys(s.musicians).some(k => k.startsWith(name))
  );

  // Comptage par section
  const sectionCounts = {};
  ['Entrée','S-E','Louange','Adoration'].forEach(sec => {
    sectionCounts[sec] = allMemberSongs.filter(s => s.section === sec).length;
  });

  // Filtres du tableau de chansons
  const searchVal  = document.getElementById('member-song-search')?.value  || '';
  const sectionVal = document.getElementById('member-section-filter')?.value || '';
  const filtered   = allMemberSongs.filter(s => {
    if (searchVal && !s.title.toLowerCase().includes(searchVal.toLowerCase())) return false;
    if (sectionVal && s.section !== sectionVal) return false;
    return true;
  });

  const page  = state.memberSongsPage;
  const per   = state.PER_PAGE || PER_PAGE;
  const slice = filtered.slice((page-1)*per, page*per);

  container.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-top:1.5rem;">

      ${buildProfileHeader(member, color, allMemberSongs.length, sectionCounts)}
      ${buildVocalRange(name)}
      ${buildVocalGroups(name)}
      ${buildTasks(name)}
      ${buildSongsTable(name, searchVal, sectionVal, filtered.length, slice)}

    </div>`;

  renderPagination('member-pagination', filtered.length, page, per, p => {
    state.memberSongsPage = p;
    renderMemberDetail(name);
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// BLOCS DU PROFIL
// ─────────────────────────────────────────────────────────────────────────────

function buildProfileHeader(member, color, totalSongs, sectionCounts) {
  return `
    <div class="member-profile-header">
      <div class="profile-avatar"
           style="background:${color}22;color:${color};border:2px solid ${color}44;">
        ${member.name[0]}
      </div>
      <div class="profile-info">
        <div class="profile-name">${esc(member.name)}</div>
        <div class="profile-role">${esc(member.role || 'Membre')}</div>
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-val">${totalSongs}</div>
            <div class="profile-stat-lbl">Chansons</div>
          </div>
          ${Object.entries(sectionCounts)
            .filter(([,v]) => v > 0)
            .map(([sec, v]) => `
              <div class="profile-stat">
                <div class="profile-stat-val" style="color:var(--${SECTION_CSS[sec]});">${v}</div>
                <div class="profile-stat-lbl">${sec}</div>
              </div>`).join('')}
        </div>
      </div>
    </div>`;
}

/** Bloc tessiture vocale */
function buildVocalRange(name) {
  const key = findKeyByName(state.vocalRanges, name);
  const vr  = key ? state.vocalRanges[key] : null;

  if (!vr || (!vr.voiceType && !vr.primaVoce)) return '';

  return `
    ${divider('🎙️ Tessiture vocale')}
    <div class="table-wrap">
      <table class="range-table">
        <thead>
          <tr>
            <th>Type de voix</th>
            <th>Low Chest</th>
            <th>High Chest</th>
            <th>Head Voice</th>
            <th>Prima Voce</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${vr.voiceType ? `<span class="voice-type-badge">${esc(vr.voiceType)}</span>` : '—'}</td>
            <td class="range-note">${esc(vr.lowChest)  || '—'}</td>
            <td class="range-note">${esc(vr.highChest) || '—'}</td>
            <td class="range-note">${esc(vr.headVoice) || '—'}</td>
            <td class="range-note">${esc(vr.primaVoce) || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

/** Bloc groupes vocaux */
function buildVocalGroups(name) {
  // 1. Quand CE membre est le lead
  const asLead = state.vocalGroups[name];

  // 2. Rôles quand les AUTRES sont leads
  const rolesWhenOthersLead = [];
  Object.entries(state.vocalGroups).forEach(([lead, parts]) => {
    if (lead === name) return;
    Object.entries(parts).forEach(([part, members]) => {
      // Cherche le prénom du membre dans les valeurs (pour les variantes d'apostrophes)
      const firstName = name.split(' ')[0].toLowerCase();
      const found = members.some(m => m.toLowerCase().includes(firstName));
      if (found) rolesWhenOthersLead.push({ lead, part });
    });
  });

  if (!asLead && !rolesWhenOthersLead.length) return '';

  let html = divider('🎶 Groupes vocaux & harmonies');

  if (asLead) {
    html += `
      <p style="font-size:0.8rem;color:var(--text2);margin-bottom:0.75rem;">
        Quand <strong style="color:var(--accent);">${esc(name)}</strong> est lead :
      </p>
      <div class="harmony-grid">
        ${Object.entries(asLead)
          .filter(([,members]) => members.length)
          .map(([part, members]) => `
            <div class="harmony-card">
              <div class="harmony-part">${esc(part)}</div>
              <div class="harmony-members">${members.map(esc).join(', ')}</div>
            </div>`).join('')}
      </div>`;
  }

  if (rolesWhenOthersLead.length) {
    html += `
      <p style="font-size:0.8rem;color:var(--text2);margin:1rem 0 0.75rem;">
        Rôle de <strong style="color:var(--accent);">${esc(name)}</strong> quand d'autres mènent :
      </p>
      <div class="harmony-grid">
        ${rolesWhenOthersLead.map(({ lead, part }) => `
          <div class="harmony-card">
            <div class="harmony-lead-label">Lead : <strong style="color:var(--text);">${esc(lead)}</strong></div>
            <div class="harmony-part">${esc(part)}</div>
          </div>`).join('')}
      </div>`;
  }

  return html;
}

/** Bloc tâches */
function buildTasks(name) {
  // Cherche le membre dans les tâches (correspondance approximative par prénom)
  const taskKey = Object.keys(state.tasks).find(k => {
    const kFirst   = k.split(' ')[0].toLowerCase();
    const nFirst   = name.split(' ')[0].toLowerCase();
    return kFirst === nFirst || k.toLowerCase() === name.toLowerCase();
  });

  const memberTasks = taskKey ? state.tasks[taskKey] : [];
  const allTasks    = [...new Set(Object.values(state.tasks).flat())];

  if (!allTasks.length) return '';

  return `
    ${divider('✅ Tâches')}
    <div class="task-list">
      ${allTasks.map(task => {
        const done = memberTasks.includes(task);
        return `
          <div class="task-item">
            <div class="task-check ${done ? 'done' : 'pending'}">${done ? '✓' : '·'}</div>
            <span class="${done ? 'task-text-done' : 'task-text-pending'}">${esc(task)}</span>
          </div>`;
      }).join('')}
    </div>`;
}

/** Bloc tableau de chansons */
function buildSongsTable(name, searchVal, sectionVal, total, slice) {
  return `
    ${divider('🎵 Chansons')}
    <div class="search-bar" style="margin-bottom:0.75rem;">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input class="search-input" id="member-song-search"
               placeholder="Rechercher une chanson..."
               value="${esc(searchVal)}"
               oninput="window._memberSearch()">
      </div>
      <select class="filter-select" id="member-section-filter"
              onchange="window._memberSearch()">
        <option value="">Toutes sections</option>
        ${['Entrée','S-E','Louange','Adoration'].map(s =>
          `<option value="${s}" ${sectionVal===s?'selected':''}>${s}</option>`
        ).join('')}
      </select>
    </div>
    <div class="results-info">${total} chanson(s)</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chanson</th>
            <th>Section</th>
            <th>Langue</th>
            <th>Tonalité de ${esc(name)}</th>
            <th>Jours</th>
          </tr>
        </thead>
        <tbody>
          ${slice.length === 0
            ? `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text3);">Aucun résultat</td></tr>`
            : slice.map(s => {
                const key = s.memberKeys[name] || '—';
                const sc  = SECTION_CSS[s.section] || 'entree';
                const lng = s.langue.toLowerCase().replace('/', '') || '—';
                return `
                  <tr class="clickable-row" onclick="window._openModal('${s.id}')">
                    <td><div class="cell-title">${esc(s.title)}</div></td>
                    <td><span class="badge badge-${sc}">${s.section}</span></td>
                    <td><span class="badge badge-${lng}">${s.langue}</span></td>
                    <td style="font-weight:600;color:${key!=='—'?'var(--accent)':'var(--text3)'};">${esc(key)}</td>
                    <td style="color:var(--text3);">${s.daysPast != null ? s.daysPast+'j' : '—'}</td>
                  </tr>`;
              }).join('')}
        </tbody>
      </table>
    </div>
    <div id="member-pagination" class="pagination"></div>`;
}

/** Génère un diviseur avec titre */
function divider(label) {
  return `
    <div class="section-divider" style="margin-top:1.5rem;">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">${label}</div>
      <div class="section-divider-line"></div>
    </div>`;
}
