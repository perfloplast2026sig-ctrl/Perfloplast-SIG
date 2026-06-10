FROM node:22-alpine AS deps
WORKDIR /app

ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 8080

CMD ["sh", "-c", "test -n \"$DATABASE_URL\" || (echo 'DATABASE_URL is required. Add it to the Railway app service variables.' && exit 1); npm run db:deploy && npm run db:seed && npm start"]
