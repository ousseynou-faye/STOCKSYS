# Backend Dockerfile (NestJS + Prisma)
# Build context: project root (.) so we can access /server and /prisma

FROM node:20-alpine AS builder
WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci

# Copy sources + prisma schema
COPY server ./server
COPY prisma ./prisma

# Generate prisma client & build
WORKDIR /app/server
# Avoid env conflicts during build; provide dummy DATABASE_URL for client generation
ENV PRISMA_IGNORE_ENV_FILES=1
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/postgres"
# Ensure no .env files are picked up during generate
RUN rm -f /app/.env /app/prisma/.env || true
RUN npx prisma generate --schema ../prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only runtime artifacts
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/main.js"]
