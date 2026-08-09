# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ARG TARGETARCH
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV TARGETARCH=${TARGETARCH}
ENV NPM_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}
COPY docker/install-pnpm.sh /tmp/install-pnpm.sh
RUN sh /tmp/install-pnpm.sh
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS builder
COPY . .
RUN pnpm --filter @hmray/bot... build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
