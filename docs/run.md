# Démarrage rapide

## Prérequis
- Node 18+ (idéalement 20)
- PostgreSQL accessible (ou `docker-compose up -d` pour un Postgres local)

## Backend (Nest)
```bash
cd server
cp .env.example .env   # remplir DATABASE_URL, JWT_SECRET, etc.
npm install
npm run db:migrate     # applique les migrations Prisma sur la base
npm run db:seed        # optionnel : données de démo
npm run start:dev      # mode dev (hot reload)
# ou npm run build && npm run start   # mode prod
# Rate limiting login: Throttler active (5 tentatives / 60s) sur /api/auth/login
```
API : http://localhost:3000/api (Swagger si activé).

## Frontend (Vite)
```bash
cd ..
cp .env.example .env   # VITE_API_BASE=/api, VITE_USE_API=true
npm install
npm run dev            # mode dev (http://localhost:5173)
# prod : npm run build puis servir dist/ derrière un reverse-proxy
```

## Démarrage combiné front + back
Depuis la racine :
```bash
npm run dev:full   # lance vite + nest start:dev en parallèle
```

## Vérifications
```bash
npm run typecheck           # front
npm run lint                # front
npm run test                # front (vitest)
cd server && npm run typecheck
cd server && npm run lint
cd server && npm run build   # vérifie la compilation Nest
```
