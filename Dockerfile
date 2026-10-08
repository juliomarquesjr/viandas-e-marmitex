# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-bookworm-slim

# Debian (e não Alpine): o motor do Prisma gerado é debian-openssl-3.0.x
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# O postinstall roda "prisma generate", então o schema precisa estar presente
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Também é usado pelo serviço "migrate" do compose (precisa do CLI do Prisma)
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_BUILD_STANDALONE=true
COPY . .
# O build não acessa o banco; a URL só precisa existir
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/customer/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
