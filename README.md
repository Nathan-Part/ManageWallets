# ManageWallets

Application web installable (PWA) pour suivre ses revenus et ses dépenses, simplement.

- **100 % locale** : les données restent sur l'appareil (IndexedDB), aucun compte, aucun serveur, fonctionne hors-ligne.
- **Saisie rapide** : bouton +, montant, catégorie, c'est enregistré.
- **Opérations récurrentes** : salaire, loyer, abonnements ajoutés automatiquement chaque mois.
- **Stats** : solde du mois, évolution sur 6 mois, répartition par catégorie.
- **Devise** : euro (€) ou shekel (₪), au choix dans l'onglet « Plus ».
- **Sauvegarde** : export / import d'un fichier JSON (onglet « Plus »).

## Développement

```bash
npm install
npm run dev      # serveur local
npm test         # tests unitaires
npm run build    # build de production dans dist/
```

Stack : Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa.

## Déploiement

Le site est 100 % statique (dossier `dist/`), donc hébergeable gratuitement partout.

**GitHub Pages (déjà configuré)** : dans le dépôt, *Settings → Pages → Source : GitHub Actions*.
Chaque push sur `main` lance ensuite `.github/workflows/deploy.yml` qui teste, build et publie.
(Sur un dépôt privé, GitHub Pages nécessite une offre payante.)

**Vercel / Netlify / Cloudflare Pages** : importer le dépôt, commande de build `npm run build`, dossier `dist`.

## Installer sur le téléphone

Ouvrir l'URL du site puis :
- **iPhone (Safari)** : Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

> Les données vivant uniquement sur l'appareil, pense à exporter une sauvegarde de temps en temps.
