/**
 * STATE.JS — État global de l'application (store centralisé)
 *
 * Toutes les vues lisent et écrivent dans cet objet.
 * On évite les variables globales éparpillées dans les fichiers.
 *
 * Usage :
 *   import { state } from './state.js';
 *   state.songs         → tableau de toutes les chansons
 *   state.songsPage     → page courante de la vue Chansons
 */

export const state = {

  // ── Données chargées depuis le fichier / Google Sheets ──────────────────
  songs: [],          // Toutes les chansons (toutes sections confondues)
  members: [],        // Membres (chanteurs + musiciens)
  progressions: {},   // { 'titre en minuscules': 'texte de la progression' }
  vocalRanges: {},    // { 'Membre': { voiceType, lowChest, highChest, headVoice, primaVoce } }
  vocalGroups: {},    // { 'Lead': { 'Soprano': [...], 'Alto 1': [...], ... } }
  tasks: {},          // { 'Membre': ['Tâche 1', 'Tâche 2', ...] }

  // ── Navigation ───────────────────────────────────────────────────────────
  currentView: 'dashboard', // 'dashboard' | 'songs' | 'members' | 'service'

  // ── Vue Chansons ─────────────────────────────────────────────────────────
  songsPage: 1,

  // ── Vue Membres ──────────────────────────────────────────────────────────
  selectedMember: null,   // nom du membre sélectionné (ou null)
  memberSongsPage: 1,

  // ── Vue Service ──────────────────────────────────────────────────────────
  servicePage: 1,
  serviceSection: 'Entrée',  // section active dans la vue Service

  // ── Paramètre partagé ────────────────────────────────────────────────────
  PER_PAGE: 25,
};

/**
 * Charge les données dans le state et les sauvegarde dans localStorage.
 * @param {Object} data - Objet retourné par le parser
 */
export function setData(data) {
  state.songs       = data.songs        || [];
  state.members     = data.members      || [];
  state.progressions= data.progressions || {};
  state.vocalRanges = data.vocalRanges  || {};
  state.vocalGroups = data.vocalGroups  || {};
  state.tasks       = data.tasks        || {};

  // Sauvegarde dans localStorage pour persistence entre sessions
  try {
    localStorage.setItem('lwc_data', JSON.stringify(data));
  } catch (e) {
    console.warn('[State] Impossible de sauvegarder dans localStorage :', e.message);
  }
}

/**
 * Charge les données depuis le cache localStorage.
 * @returns {Object|null} données ou null si aucune donnée en cache
 */
export function loadFromCache() {
  try {
    const raw = localStorage.getItem('lwc_data');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[State] Erreur de lecture du cache :', e.message);
    return null;
  }
}

/**
 * Réinitialise l'état (mais pas le cache localStorage).
 */
export function resetState() {
  state.songs = [];
  state.members = [];
  state.progressions = {};
  state.vocalRanges = {};
  state.vocalGroups = {};
  state.tasks = {};
  state.currentView = 'dashboard';
  state.songsPage = 1;
  state.selectedMember = null;
  state.memberSongsPage = 1;
  state.servicePage = 1;
  state.serviceSection = 'Entrée';
}
