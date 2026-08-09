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
COPY apps/admin/package.json ./apps/admin/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @hmray/admin... build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app ./
WORKDIR /app/apps/admin
EXPOSE 3000
CMD ["../../node_modules/.bin/next", "start", "-p", "3000"]
