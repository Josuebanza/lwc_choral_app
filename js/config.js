/**
 * CONFIG.JS — Constantes globales de l'application
 *
 * Ce fichier centralise toutes les valeurs qui pourraient changer :
 *  - Liste des membres chanteurs
 *  - Correspondance section → couleur CSS
 *  - Couleurs d'avatars
 *  - Paramètres de pagination
 *
 * Pour ajouter un membre : l'ajouter dans le tableau SINGERS.
 * Pour changer les couleurs : modifier les variables dans base.css.
 */

// ─── Liste des chanteurs connus ──────────────────────────────────────────────
// Utilisé par le parser pour identifier les colonnes de tonalités dans le XLSX.
// NOTE : les noms doivent correspondre EXACTEMENT aux en-têtes de colonnes
//        (sans "Key" — le parser cherche le premier mot du nom dans les en-têtes).
export const SINGERS = [
  'Dorcas',
  'Harmony',
  'Jemima',
  'Jovany',
  'Maman Annie',
  'Nellia',
  'Voldie',
  'Ya Itie',
  'Raphael',
  'Joel',
  'Furah',
  'Irene',
];

// ─── Correspondance section → classe CSS ────────────────────────────────────
// Utilisé pour les badges et couleurs d'accentuation par section du culte.
export const SECTION_CSS = {
  'Entrée':    'entree',
  'S-E':       'se',
  'Louange':   'louange',
  'Adoration': 'adoration',
};

// ─── Couleurs d'avatars des membres ─────────────────────────────────────────
// Assignées par ordre d'apparition dans la liste des membres.
export const AVATAR_COLORS = [
  '#c9a84c', // or
  '#10b981', // vert
  '#818cf8', // violet
  '#f97316', // orange
  '#f59e0b', // ambre
  '#60a5fa', // bleu
  '#34d399', // emeraude
  '#f472b6', // rose
  '#a78bfa', // lavande
  '#4ade80', // vert clair
  '#fb923c', // pêche
  '#e879f9', // fuchsia
];

// ─── Pagination ──────────────────────────────────────────────────────────────
// Nombre de lignes affichées par page dans les tableaux.
export const PER_PAGE = 25;

// ─── Colonnes musiciens ──────────────────────────────────────────────────────
// Labels des musiciens tels qu'ils apparaissent dans les en-têtes du XLSX.
// Utilisé pour afficher les chips dans le modal de chanson.
export const MUSICIAN_LABELS = {
  'Nellia Piano':   'Nellia (Piano)',
  'Raphael Piano':  'Raphael (Piano)',
  'Francis Piano':  'Francis (Piano)',
  'Jason Drum':     'Jason (Batterie)',
  'Raphael Drum':   'Raphael (Batterie)',
  'Joshua Drum':    'Joshua (Batterie)',
  'Francis Bass':   'Francis (Basse)',
  'Raphael Bass':   'Raphael (Basse)',
  'Raphael Guitar': 'Raphael (Guitare)',
};

// ─── Libellés des langues ────────────────────────────────────────────────────
export const LANGUE_LABELS = {
  'FR':   'Français',
  'ENG':  'Anglais',
  'LNGL': 'Lingala',
  '—':    'Non défini',
};
