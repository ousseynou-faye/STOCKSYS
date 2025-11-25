# Operations / Environnements

Guide pour préparer les envs (dev, CI, staging, prod) et brancher Postgres managé.

## Variables d’environnement

### Frontend (`.env`)
- `VITE_API_BASE` : URL de base de l’API (`/api` en reverse-proxy, ou `https://api.exemple.com/api` si séparé).
- `VITE_USE_API` : `true` pour cibler l’API Nest, `false` pour le mock local éventuel.
- `VITE_STRICT_API` : `true` pour couper le fallback mock.

### Backend (`server/.env`)
- `DATABASE_URL` : chaîne Postgres (URL managée en prod ; `?sslmode=require` si fournisseur l’impose).
- `JWT_SECRET` : clé forte et unique par environnement.
- `PORT` : port d’écoute Nest (par défaut 3000).
- `SWAGGER_ENABLED` : `true/false` selon si la doc est exposée (désactiver ou protéger en prod).
- `SWAGGER_USER` / `SWAGGER_PASSWORD` : basic auth facultatif pour `/api/docs`.
- `SWAGGER_IP_WHITELIST` : liste d’IP ou préfixes autorisés pour `/api/docs` (séparés par des virgules).
- `LOG_WEBHOOK_URL` : URL d’agrégation/alerting (HTTP POST) pour les logs `scope_violation`/`api_error` et autres événements observability.

## Postgres managé (staging/prod)
1) Créer une base Postgres managée et récupérer l’URL de connexion (inclure `?sslmode=require` si nécessaire).
2) Configurer le secret `DATABASE_URL` dans l’infra (ex : GitHub Actions secrets, variables d’environnements du service).
3) Depuis une runner/bastion ayant accès à la base, exécuter les migrations :
   - `cd server`
   - `npm ci` (si besoin)
   - `npx prisma migrate deploy --schema ../prisma/schema.prisma`
4) Alimenter les données de départ (optionnel) :
   - `npm run db:seed` (nécessite que `DATABASE_URL` pointe vers la base cible).

## Déploiement backend (Nest)
- Build : `cd server && npm run build`.
- Lancer : `node dist/main.js` (env vars chargées via le process manager).
- Vérifier santé : requête GET sur `/api/docs` (si activé) ou un endpoint public protégé.

## Déploiement frontend (Vite)
- Copier `.env` avec `VITE_API_BASE` pointant vers le domaine/API back.
- Build : `npm run build`.
- Servir le dossier `dist/` derrière un reverse-proxy qui route `/api` vers Nest.

## CI/CD recommandé
- Étape install : `npm ci` (racine) et `npm ci` dans `server/`.
- Étape tests front : `npm run test`.
- Étape build back : `cd server && npm run build`.
- Étape migrations sur env cible (pipeline ou job manuel) : `cd server && npx prisma migrate deploy`.
- Optionnel : `npm audit --audit-level=high` en CI.
- Workflow CI : un job `migrations` est prêt sur la branche `infra*` pour appliquer `prisma migrate deploy` (secret `DATABASE_URL` requis) puis `npm run db:seed` optionnel.
- Observabilité : les événements `scope_violation`/`override` et `api_error` sont journalisés de façon structurée (env + traceId propagé) et peuvent être aspirés vers un webhook (`LOG_WEBHOOK_URL`) pour alerting (Slack/ELK/Azure/CloudWatch). Un middleware ajoute un `x-trace-id` (accepté depuis l’appelant ou généré). Intégrez ce trace dans vos dashboards/alerts.

## Notes
- Ne jamais committer de secrets (`JWT_SECRET`, `DATABASE_URL`). Utiliser les stores de secrets de votre hébergeur/CI.
- En prod, protéger ou désactiver Swagger (`SWAGGER_ENABLED=false` ou guard IP/auth). 
