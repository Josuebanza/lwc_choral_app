# 🎵 LWC — Gestionnaire de Répertoire Musical

Application web statique pour gérer le répertoire de chants, les tonalités par membre, les musiciens et la planification des services.

---

## 📁 Structure du projet

```
lwc-app/
├── index.html              ← Point d'entrée principal
├── README.md               ← Ce fichier
│
├── css/
│   ├── base.css            ← Variables CSS, reset, typographie
│   ├── setup.css           ← Écran de configuration (chargement des données)
│   ├── layout.css          ← Sidebar + structure principale de l'app
│   └── components.css      ← Composants réutilisables (badges, tables, modals, etc.)
│
└── js/
    ├── config.js           ← Constantes globales (liste des membres, couleurs, etc.)
    ├── state.js            ← État global de l'application (données + filtres)
    ├── parser.js           ← Parsing du fichier XLSX et des CSV Google Sheets
    ├── setup.js            ← Logique de l'écran de configuration
    ├── utils.js            ← Fonctions utilitaires (pagination, toast, formatage)
    ├── modal.js            ← Modal de détail d'une chanson
    ├── main.js             ← Initialisation et navigation entre vues
    └── views/
        ├── dashboard.js    ← Vue Dashboard (stats + panneaux récents)
        ├── songs.js        ← Vue Chansons (table + filtres)
        ├── members.js      ← Vue Membres (cartes + profil détaillé)
        └── service.js      ← Vue Service (onglets par section)
```

---

## 🚀 Déploiement sur GitHub Pages (gratuit)

### Étape 1 — Créer un dépôt GitHub
1. Aller sur [github.com](https://github.com) → **New repository**
2. Nommer le dépôt (ex: `lwc-repertoire`)
3. Choisir **Public**
4. Cliquer **Create repository**

### Étape 2 — Uploader les fichiers
1. Dans le dépôt, cliquer **Add file → Upload files**
2. Glisser-déposer **tout le contenu** du dossier `lwc-app/` (pas le dossier lui-même)
3. S'assurer que `index.html` est bien à la racine du dépôt
4. Cliquer **Commit changes**

### Étape 3 — Activer GitHub Pages
1. Aller dans **Settings** du dépôt
2. Dans le menu gauche : **Pages**
3. Source : **Deploy from a branch**
4. Branch : **main** → **/ (root)**
5. Cliquer **Save**

✅ Après ~2 minutes, l'app sera accessible à : `https://[ton-nom].github.io/lwc-repertoire/`

---

## 📊 Source de données

### Option A — Fichier XLSX (recommandé pour commencer)
- Glisser-déposer le fichier `.xlsx` directement dans l'app
- Les données sont sauvegardées dans le navigateur (localStorage)
- Pour mettre à jour : recharger un nouveau fichier

### Option B — Google Sheets en direct
- Permet des mises à jour automatiques depuis le Sheet existant
- La personne qui gère le Sheet n'a pas besoin de toucher au code

#### Configuration Google Sheets :
1. Ouvrir le Google Sheet
2. **Fichier → Partager → Publier sur le web**
3. Choisir chaque feuille → format **CSV** → **Publier**
4. Copier l'**ID du fichier** depuis l'URL :
   ```
   docs.google.com/spreadsheets/d/[ID ICI]/edit
   ```
5. Pour chaque feuille, trouver son **GID** :
   - Cliquer sur l'onglet de la feuille
   - Regarder l'URL : `...#gid=XXXXXXXXX`
   - Le nombre après `gid=` est le GID
6. Entrer l'ID + les GIDs dans l'écran de configuration de l'app

#### Feuilles requises (GID obligatoire) :
| Feuille | Description |
|---------|-------------|
| Entrée | Chansons section Entrée |
| S-E | Chansons section Service-Évangélisation |
| Louange | Chansons de Louange |
| Adoration | Chansons d'Adoration |

#### Feuilles optionnelles (GID optionnel) :
| Feuille | Description |
|---------|-------------|
| Progression Blank | Progressions d'accords |
| Report sheet | Liste des membres |
| Vocal Range | Tessitures vocales |
| Groupes vocal | Groupes d'harmonies |
| Taches | Tâches des membres |

---

## 🛠️ Dépannage

### "Aucune chanson trouvée" après chargement du fichier
- Vérifier que le fichier est bien un `.xlsx` (pas `.xls` ou `.csv`)
- S'assurer que les feuilles s'appellent exactement `Entrée`, `S-E`, `Louange`, `Adoration`

### Erreur Google Sheets "HTTP 400" ou "HTTP 403"
- Le Sheet n'est pas publié correctement
- Refaire : **Fichier → Partager → Publier sur le web → Publier tout le document**

### Les données d'un membre ne s'affichent pas (tessiture, tâches)
- Vérifier que le nom dans `Vocal Range` / `Taches` correspond exactement au nom dans les feuilles de chansons
- Les noms sont sensibles aux espaces et accents

### L'app ne se met pas à jour après modification du Sheet
- Google Sheets met parfois 5 minutes à répercuter les changements
- Recharger la page et re-cliquer "Connecter Google Sheets"

---

## 🧩 Architecture technique

- **Aucun framework** : HTML/CSS/JS pur — pas de Node.js, pas de build
- **Librairies CDN** :
  - [SheetJS (xlsx)](https://sheetjs.com/) — lecture des fichiers Excel
  - [PapaParse](https://www.papaparse.com/) — parsing CSV (Google Sheets)
  - [Google Fonts](https://fonts.google.com/) — typographies Cormorant Garamond + Outfit
- **Persistance** : `localStorage` — les données chargées restent disponibles entre les sessions

---

## 📝 Modifier l'app

### Ajouter un nouveau membre chanteur
Dans `js/config.js`, ajouter le nom dans le tableau `SINGERS` :
```js
export const SINGERS = [
  'Dorcas', 'Harmony', 'Jemima', // ...
  'NouveauMembre',  // ← ajouter ici
];
```

### Changer les couleurs
Dans `css/base.css`, modifier les variables CSS :
```css
:root {
  --accent: #c9a84c;   /* Or principal */
  --entree: #10b981;   /* Vert Entrée  */
  --se: #f97316;       /* Orange S-E   */
  /* ... */
}
```

### Changer le nombre de résultats par page
Dans `js/config.js` :
```js
export const PER_PAGE = 25; // ← modifier ici
```
