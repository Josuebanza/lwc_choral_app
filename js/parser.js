/**
 * PARSER.JS — Conversion des données XLSX / CSV en objets utilisables
 *
 * Ce module gère :
 *  1. La lecture d'un fichier Excel (.xlsx) via SheetJS
 *  2. La lecture de plusieurs feuilles CSV depuis Google Sheets
 *  3. La normalisation des données pour chaque type de feuille
 *
 * Toutes les fonctions retournent un objet { songs, members, progressions,
 * vocalRanges, vocalGroups, tasks } qui est ensuite passé à setData().
 */

import { SINGERS } from './config.js';
import { normalizePersonName } from './utils.js';


// ─────────────────────────────────────────────────────────────────────────────
// POINT D'ENTRÉE — Fichier XLSX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse un fichier Excel (.xlsx) chargé en ArrayBuffer.
 * Utilise la librairie SheetJS (XLSX) disponible globalement via CDN.
 *
 * @param {ArrayBuffer} arrayBuffer - Contenu du fichier .xlsx
 * @returns {Object} - Données normalisées { songs, members, ... }
 */
export function parseXLSX(arrayBuffer) {
  const wb = window.XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  return parseWorkbook(wb);
}

/**
 * Orchestre le parsing de toutes les feuilles du classeur Excel.
 * @param {Object} wb - Workbook SheetJS
 * @returns {Object}
 */
function parseWorkbook(wb) {
  const data = makeEmptyData();

  wb.SheetNames.forEach(name => {
    const type = getSheetType(name);
    if (!type) return; // feuille ignorée (Old_Style_*, etc.)

    // Convertit la feuille en tableau de tableaux (header:1 = première ligne comme index 0)
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      raw: false,    // tout en string (évite les nombres bruts pour les dates)
      defval: '',    // cellule vide = chaîne vide
    });

    processSheet(rows, canonicalSheetName(name, type), type, data);
  });

  return data;
}


// ─────────────────────────────────────────────────────────────────────────────
// POINT D'ENTRÉE — Google Sheets CSV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge et parse plusieurs feuilles depuis Google Sheets (format CSV public).
 *
 * @param {string} spreadsheetId - ID du Google Spreadsheet
 * @param {Object} gids - { 'Entrée': '123', 'S-E': '456', ... }
 * @returns {Promise<Object>} - Données normalisées
 */
export async function parseGoogleSheets(spreadsheetId, gids) {
  const data = makeEmptyData();

  for (const [sheetName, gid] of Object.entries(gids)) {
    if (!gid) continue; // GID vide = feuille optionnelle non configurée

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    let csv;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      csv = await response.text();
    } catch (err) {
      console.warn(`[Parser] Impossible de charger la feuille "${sheetName}" (GID ${gid}) :`, err.message);
      continue;
    }

    // Papa.parse est disponible globalement via CDN
    const parsed = window.Papa.parse(csv, { skipEmptyLines: false });
    const rows   = parsed.data;

    const type = getSheetType(sheetName);
    if (type) processSheet(rows, canonicalSheetName(sheetName, type), type, data);
  }

  return data;
}


// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH — Routage vers le bon parseur
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatche les lignes brutes vers le bon parseur selon le type de feuille.
 */
function processSheet(rows, sheetName, type, data) {
  switch (type) {
    case 'songs':        parseSongSheet(rows, sheetName, data);  break;
    case 'progressions': parseProgressions(rows, data);          break;
    case 'members':      parseMembers(rows, data);               break;
    case 'vocalRange':   parseVocalRange(rows, data);            break;
    case 'vocalGroups':  parseVocalGroups(rows, data);           break;
    case 'tasks':        parseTasks(rows, data);                 break;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR FEUILLES DE CHANSONS (Entrée, S-E, Louange, Adoration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une feuille de chansons (structure commune aux 4 sections).
 *
 * Structure attendue du XLSX :
 *  - Ligne 0 : en-têtes de groupe ("VOCALS", "Musician: Keyboardist", ...)
 *  - Ligne 1 : en-têtes de colonnes ("Songs: Original key", "Last sang", ...)
 *  - Lignes 2+ : données
 *
 * @param {Array[]} rows - Tableau de lignes (chaque ligne = tableau de cellules)
 * @param {string}  section - Nom de la section ('Entrée', 'S-E', etc.)
 * @param {Object}  data - Objet de données à mutater
 */
function parseSongSheet(rows, section, data) {
  // ── Trouver la ligne d'en-têtes ──
  // On cherche la ligne dont la première cellule contient "song" ou "chanson"
  let headerIdx = 1; // valeur par défaut
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const cell = String(rows[i][0] || '').toLowerCase();
    if (cell.includes('song') || cell.includes('chanson') || cell.includes('titre')) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx].map(h => String(h || '').replace(/\n/g, ' ').trim());

  // ── Détecter les indices de colonnes ──
  const cols = detectColumns(headers);

  // ── Parser chaque ligne de chanson ──
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawTitle = String(row[cols.title] || '').trim();
    if (!rawTitle || rawTitle.length < 2) continue;

    // "Titre de chanson: Tonalité" → { title: 'Titre', originalKey: 'Tonalité' }
    const { title, originalKey } = parseTitleKey(rawTitle);
    if (!title) continue;

    // Tonalités par membre (colonnes avec "Key" dans l'en-tête)
    const memberKeys = {};
    Object.entries(cols.memberKeys).forEach(([member, colIdx]) => {
      const val = String(row[colIdx] || '').trim();
      if (val && val !== '0' && val !== '-') memberKeys[member] = val;
    });

    // Musiciens assignés (colonne avec 'x' ou 'X')
    const musicians = {};
    Object.entries(cols.musicians).forEach(([key, colIdx]) => {
      const val = String(row[colIdx] || '').toLowerCase().trim();
      if (val === 'x' || val === '✓' || val === 'yes') musicians[key] = true;
    });

    // Date de dernière utilisation
    let lastSang = null;
    if (cols.lastSang >= 0 && row[cols.lastSang]) {
      const d = new Date(row[cols.lastSang]);
      if (!isNaN(d.getTime())) lastSang = d.toISOString().split('T')[0];
    }

    const song = {
      // Identifiant unique pour ce tableau
      id: `${section}_${r}`,

      title,
      originalKey,
      section,

      // Métadonnées
      lastSang,
      daysPast:   cols.daysPast >= 0 ? parseInt(row[cols.daysPast]) || null : null,
      creuSommet: cols.creuSommet >= 0 ? String(row[cols.creuSommet] || '').trim() : '',
      langue:     cols.langue >= 0
                    ? String(row[cols.langue] || '').trim().toUpperCase() || '—'
                    : '—',

      // Disponibilité des ressources
      hasLyrics:     cols.lyrics >= 0    ? /yes|oui/i.test(String(row[cols.lyrics]    || '')) : false,
      hasProgression:cols.progression >= 0 ? /yes|oui/i.test(String(row[cols.progression] || '')) : false,

      // Infos musicales
      memberKeys,
      musicians,
    };

    data.songs.push(song);
  }
}

/**
 * Détecte dynamiquement les indices de colonnes à partir des en-têtes.
 * Robuste aux variations d'ordre et de libellé entre les feuilles.
 *
 * @param {string[]} headers
 * @returns {Object} - Dictionnaire nom → indice
 */
function detectColumns(headers) {
  const cols = {
    title: 0,
    lastSang: -1,
    daysPast: -1,
    creuSommet: -1,
    langue: -1,
    lyrics: -1,
    progression: -1,
    memberKeys: {},   // { 'Jemima': 9, 'Dorcas': 7, ... }
    musicians: {},    // { 'Nellia Piano': 20, ... }
  };

  headers.forEach((h, i) => {
    const hl = h.toLowerCase();

    if (i === 0) { cols.title = 0; return; }

    // Colonnes de base
    if (hl.includes('last') || (hl.includes('sang') && i < 5))  cols.lastSang   = i;
    if (hl.includes('days') || hl.includes('past'))              cols.daysPast   = i;
    if (hl.includes('creu') || hl.includes('sommet'))            cols.creuSommet = i;
    if (hl.includes('langu'))                                     cols.langue     = i;
    if (hl.includes('lyrc')  || hl.includes('lyric'))            cols.lyrics     = i;
    // progression : seulement dans les 10 premières colonnes (évite faux positifs)
    if (hl.includes('progress') && i < 10)                       cols.progression= i;

    // Colonnes de tonalités des chanteurs (cols 7-20 environ)
    if (i >= 7 && i <= 22 && hl.includes('key')) {
      SINGERS.forEach(singer => {
        // Cherche le premier mot du nom dans l'en-tête
        const firstWord = singer.split(' ')[0].toLowerCase();
        if (hl.includes(firstWord) && !cols.memberKeys[singer]) {
          cols.memberKeys[singer] = i;
        }
      });
    }

    // Colonnes musiciens (piano, drum, bass, guitar) — cols 19-29 environ
    if (i >= 19 && (hl.includes('piano') || hl.includes('drum') || hl.includes('bass') || hl.includes('guitar'))) {
      const parts = h.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const key = `${parts[0]} ${parts[1]}`;
        cols.musicians[key] = i;
      }
    }
  });

  return cols;
}

/**
 * Extrait le titre et la tonalité depuis une cellule "Titre: Tonalité".
 * Ex: "10 000 Reasons: G" → { title: '10 000 Reasons', originalKey: 'G' }
 * Ex: "Alleluia" → { title: 'Alleluia', originalKey: '' }
 *
 * @param {string} raw
 * @returns {{ title: string, originalKey: string }}
 */
function parseTitleKey(raw) {
  const clean = raw.replace(/\n/g, ' ').trim();
  const colonIdx = clean.lastIndexOf(':');

  if (colonIdx > 0) {
    return {
      title:       clean.slice(0, colonIdx).trim(),
      originalKey: clean.slice(colonIdx + 1).trim(),
    };
  }

  return { title: clean, originalKey: '' };
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR PROGRESSIONS D'ACCORDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure attendue : colonne A = titre, colonne B = ligne de progression.
 * Les lignes sans titre (col A vide) sont des suites de la chanson précédente.
 *
 * @param {Array[]} rows
 * @param {Object}  data
 */
function parseProgressions(rows, data) {
  let currentTitle = null;
  let currentLines = [];

  // Sauvegarde la progression courante dans data
  const save = () => {
    if (currentTitle && currentLines.length) {
      data.progressions[currentTitle.toLowerCase()] = currentLines.join('\n');
    }
  };

  rows.forEach(row => {
    const rawTitle = String(row[0] || '').trim();
    const progLine = String(row[1] || '').trim();

    if (rawTitle && rawTitle.toLowerCase() !== 'titles') {
      save();
      // Nettoie le titre : enlève le ":" final éventuel
      currentTitle = rawTitle.replace(/:$/, '').replace(/\n/g, ' ').trim();
      currentLines = progLine ? [progLine] : [];
    } else if (progLine) {
      currentLines.push(progLine);
    }
  });

  save(); // Sauvegarde la dernière entrée
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR MEMBRES (Report sheet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure : col A = nom, col B = rôle (Singer / Musician / Musician & Singer)
 */
function parseMembers(rows, data) {
  const HEADER_NAME_RE = /member/i;
  const HEADER_ROLE_RE = /(group|function|type|role)/i;
  const VALID_ROLE_RE  = /(singer|musician|membre|chanteur)/i;
  const INVALID_NAME_RE = /^(total|opening|entry|entree|song|songs|praise|worship|language|chart)$/i;

  // Trouve la ligne d'en-tête et les indices des colonnes Nom / Rôle
  let headerIdx = -1;
  let nameCol   = 0;
  let roleCol   = 1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const nci = row.findIndex(cell => HEADER_NAME_RE.test(String(cell || '')));
    if (nci < 0) continue;

    const rci = row.findIndex(cell => HEADER_ROLE_RE.test(String(cell || '')));
    headerIdx = i;
    nameCol   = nci;
    roleCol   = rci >= 0 ? rci : Math.max(0, nci + 1);
    break;
  }

  // Fallback: ancienne structure simple (A/B)
  if (headerIdx < 0) {
    headerIdx = 1;
    nameCol   = 0;
    roleCol   = 1;
  }

  let started = false;

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row  = rows[r] || [];
    const name = String(row[nameCol] || '').replace(/\n/g, ' ').trim();
    const role = String(row[roleCol] || '').replace(/\n/g, ' ').trim();

    // Une fois la liste commencée, la première ligne vide marque la fin du bloc membres
    if (started && !name && !role) break;
    if (!name) continue;

    started = true;

    // Ignore en-têtes résiduels, valeurs numériques et lignes de résumé
    if (HEADER_NAME_RE.test(name)) continue;
    if (!isNaN(Number(name))) continue;
    if (INVALID_NAME_RE.test(name)) continue;

    // Ignore les lignes qui ne ressemblent pas à un rôle membre
    if (role && !VALID_ROLE_RE.test(role)) continue;

    // Évite les doublons
    if (!data.members.find(m => normalizePersonName(m.name) === normalizePersonName(name))) {
      data.members.push({ name, role: role || 'Membre' });
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR TESSITURE VOCALE (Vocal Range)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse la feuille Vocal Range via des ancres textuelles (ex: "Voice Type")
 * pour rester robuste même si des lignes/colonnes sont décalées.
 */
function parseVocalRange(rows, data) {
  const norm = (v) => String(v || '').replace(/\n/g, ' ').trim();
  const toKey = (v) => norm(v).toLowerCase();
  const getRow = (idx) => rows[idx] || [];

  // Localise dynamiquement la ligne "Voice Type" pour éviter tout décalage
  // si une ligne est insérée/supprimée dans la feuille.
  const typeRowIdx = rows.findIndex(row =>
    (row || []).some(cell => {
      const k = toKey(cell);
      return k.includes('voice') && k.includes('type');
    })
  );

  if (typeRowIdx < 0) return;

  const isMemberName = (val) => {
    const t = norm(val);
    if (!t) return false;
    if (/^(voice type|refer to table below|middle c|from:|to:|soprano|alto|tenor|bass)$/i.test(t)) return false;
    return /^[A-Za-z][A-Za-z'\- ]*$/.test(t);
  };
  const countNames = (row) => (row || []).filter(isMemberName).length;

  // Cherche la meilleure ligne de noms juste au-dessus de "Voice Type".
  let nameRowIdx = -1;
  let bestScore = -1;
  for (let i = Math.max(0, typeRowIdx - 6); i < typeRowIdx; i++) {
    const score = countNames(getRow(i));
    if (score > bestScore) {
      bestScore = score;
      nameRowIdx = i;
    }
  }
  if (nameRowIdx < 0 || bestScore < 2) return;

  const findMetricRowIdx = (labelRe) => {
    // Priorité: lignes après "Voice Type"
    for (let i = typeRowIdx + 1; i < rows.length; i++) {
      const row = getRow(i);
      if (row.some(cell => labelRe.test(toKey(cell)))) return i;
    }
    // Fallback: recherche globale
    for (let i = 0; i < rows.length; i++) {
      const row = getRow(i);
      if (row.some(cell => labelRe.test(toKey(cell)))) return i;
    }
    return -1;
  };

  const lowRowIdx   = findMetricRowIdx(/low\s*chest/);
  const highRowIdx  = findMetricRowIdx(/high\s*chest/);
  const headRowIdx  = findMetricRowIdx(/head\s*voice/);
  const primaRowIdx = findMetricRowIdx(/prima\s*voce/);

  const nameRow  = getRow(nameRowIdx);
  const typeRow  = getRow(typeRowIdx);
  const lowRow   = getRow(lowRowIdx);
  const highRow  = getRow(highRowIdx);
  const headRow  = getRow(headRowIdx);
  const primaRow = getRow(primaRowIdx);

  for (let col = 0; col < nameRow.length; col++) {
    const rawName = norm(nameRow[col]);
    if (!isMemberName(rawName)) continue;

    const voiceType = norm(typeRow[col]);
    const lowChest  = norm(lowRow[col]);
    const highChest = norm(highRow[col]);
    const headVoice = norm(headRow[col]);
    const primaVoce = norm(primaRow[col]);

    // Ignore les colonnes de nom qui n'ont aucune donnée de tessiture.
    if (!voiceType && !lowChest && !highChest && !headVoice && !primaVoce) continue;

    data.vocalRanges[rawName] = {
      voiceType,
      lowChest,
      highChest,
      headVoice,
      primaVoce,
    };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR GROUPES VOCAUX (Groupes vocal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure :
 *  - Ligne 2 : ['Lead', 'Jemima', 'Dorcas', 'Nellia', ...]
 *  - Ligne 3 : ['Soprano', membres quand Jemima lead, membres quand Dorcas lead, ...]
 *  - Ligne 4 : ['Alto 1', ...]
 *  - Ligne 5 : ['Alto 2/Tenor', ...]
 *  - Ligne 6 : ['Bass', ...]
 */
function parseVocalGroups(rows, data) {
  const norm = (v) => String(v || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const toKey = (v) => norm(v).toLowerCase();
  const PARTS = ['Soprano', 'Alto 1', 'Alto 2/Tenor', 'Bass'];

  const partLabel = (label) => {
    const k = toKey(label);
    if (!k) return null;
    if (k.includes('soprano')) return 'Soprano';
    if (k.includes('alto 1')) return 'Alto 1';
    if (k.includes('alto 2') || k.includes('tenor')) return 'Alto 2/Tenor';
    if (k.includes('bass')) return 'Bass';
    return null;
  };

  const leadRowIdx = rows.findIndex(row =>
    (row || []).some(cell => /^lead$/i.test(norm(cell)))
  );
  if (leadRowIdx < 0) return;

  const leadRow = rows[leadRowIdx] || [];
  const leadLabelCol = leadRow.findIndex(cell => /^lead$/i.test(norm(cell)));
  if (leadLabelCol < 0) return;

  const leads = [];
  for (let col = leadLabelCol + 1; col < leadRow.length; col++) {
    const lead = norm(leadRow[col]);
    if (!lead) continue;
    leads.push({ lead, col });
    data.vocalGroups[lead] = {};
    PARTS.forEach(p => { data.vocalGroups[lead][p] = []; });
  }
  if (!leads.length) return;

  for (let r = leadRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const part = partLabel(row[leadLabelCol]);

    const rowHasData = row.some(cell => norm(cell));
    if (!rowHasData) break;
    if (!part) continue;

    leads.forEach(({ lead, col }) => {
      const raw = norm(row[col]).replace(/,\s*$/, '');
      data.vocalGroups[lead][part] = raw
        ? raw.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// PARSEUR TÂCHES (Taches)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure :
 *  - Ligne 2 : [null, 'Tasks', 'Raphael', 'Francis', 'Nellia', ...(membres)]
 *  - Lignes 3+ : [null, 'Nom de la tâche', 'x'|'' pour chaque membre]
 */
function parseTasks(rows, data) {
  const headerRow = rows[2] || [];

  // Construit la liste des membres avec leur index de colonne
  const memberCols = [];
  for (let col = 2; col < headerRow.length; col++) {
    const name = String(headerRow[col] || '').trim();
    if (name) {
      memberCols.push({ name, col });
      data.tasks[name] = []; // Initialise le tableau de tâches
    }
  }

  // Parcourt les lignes de tâches
  for (let r = 3; r < rows.length; r++) {
    const row      = rows[r];
    const taskName = String(row[1] || '').trim();
    if (!taskName) continue;

    memberCols.forEach(({ name, col }) => {
      const val = String(row[col] || '').trim().toLowerCase();
      if (val === 'x') {
        data.tasks[name].push(taskName);
      }
    });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un objet de données vide avec toutes les clés attendues.
 * Utilisé comme point de départ pour chaque parsing.
 */
function makeEmptyData() {
  return {
    songs: [],
    members: [],
    progressions: {},
    vocalRanges: {},
    vocalGroups: {},
    tasks: {},
  };
}

function normalizeSheetName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getSheetType(sheetName) {
  const n = normalizeSheetName(sheetName);
  if (n === 'entree' || n === 's-e' || n === 'se' || n === 'louange' || n === 'adoration') return 'songs';
  if (n === 'progression blank') return 'progressions';
  if (n === 'report sheet') return 'members';
  if (n === 'vocal range') return 'vocalRange';
  if (n === 'groupes vocal' || n === 'groupes vocaux') return 'vocalGroups';
  if (n === 'taches' || n === 'tasks') return 'tasks';
  return null;
}

function canonicalSheetName(sheetName, type) {
  if (type !== 'songs') return sheetName;

  const n = normalizeSheetName(sheetName);
  if (n === 'entree') return 'Entrée';
  if (n === 's-e' || n === 'se') return 'S-E';
  if (n === 'louange') return 'Louange';
  if (n === 'adoration') return 'Adoration';
  return sheetName;
}
