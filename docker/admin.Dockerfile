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
# Hoisted node_modules so Next runtime binaries work after COPY between stages
RUN printf 'node-linker=hoisted\nshamefully-hoist=true\n' > .npmrc
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS builder
COPY . .
# Keep hoisted linker for the build too
RUN printf 'node-linker=hoisted\nshamefully-hoist=true\n' > .npmrc
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @hmray/admin... build \
  && test -d apps/admin/.next \
  && test -e node_modules/next/dist/bin/next \
  && echo "admin build OK"

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=/api
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin ./apps/admin
COPY --from=builder /app/packages/config ./packages/config
COPY --from=builder /app/packages/types ./packages/types

WORKDIR /app/apps/admin
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=8 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode&&r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

# Absolute path + bind all interfaces (fixes Docker 502 / connection refused)
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
