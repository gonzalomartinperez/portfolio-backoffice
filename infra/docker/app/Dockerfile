# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# Canonical Next.js image (ecosystem standard 8; master plan ci-cd.md section 7). Base images are
# build arguments so the Node 26 flip (E10) and the weekly dependency PR change one line each.
ARG NODE_IMAGE=node:24.22.2-trixie-slim@sha256:0820eaa85e07d0490446dd01d14707e17e6108a36988cf374899cd057eb3812d
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot@sha256:088a01637f22908632ba09018be2e0b516f2fa6f7869c191d29491139db43c78

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --ignore-scripts --no-audit --no-fund
COPY next.config.ts next-env.d.ts tsconfig.json ./
COPY src ./src
COPY contracts/types.d.ts contracts/operations.types.d.ts contracts/product-analytics.types.d.ts contracts/feedback.types.d.ts ./contracts/
COPY contracts/product-analytics-v2.types.d.ts contracts/product-analytics-v2.schema.json ./contracts/
COPY public ./public
COPY scripts/auth-migrate.ts scripts/prepare-runtime.ts ./scripts/
COPY migrations ./migrations
RUN npm run build && mkdir -p .next/standalone/.next/cache

FROM ${RUNTIME_IMAGE} AS runtime
WORKDIR /app
COPY LICENSE ./LICENSE
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ENV PATH=/nodejs/bin:/usr/local/bin:/usr/bin:/bin
COPY --from=build --chown=65532:65532 /app/.next/standalone ./
COPY --from=build --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=build --chown=65532:65532 /app/public ./public
# Version stamp from non-secret build arguments only (provenance mode=max records build args).
# Last, so a new commit changes only these metadata layers, not the build cache.
ARG APP_VERSION=0.0.0
ARG APP_REVISION=unknown
ARG BUILD_DATE=1970-01-01T00:00:00Z
LABEL org.opencontainers.image.title="portfolio-backoffice" \
      org.opencontainers.image.description="Private operations console for the portfolio assistant" \
      org.opencontainers.image.documentation="https://github.com/gonzalomartinperez/portfolio-backoffice/tree/main/docs" \
      org.opencontainers.image.source="https://github.com/gonzalomartinperez/portfolio-backoffice" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="MIT"
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}
USER 65532:65532
# Deviation from the canonical row: keep an empty entrypoint so `docker run <image> node
# scripts/auth-migrate.ts` (the vps-ops migration command) and `node server.js` stay explicit.
ENTRYPOINT []
STOPSIGNAL SIGTERM
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/ready',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
