FROM node:22-bookworm-slim AS build

# Argon2 includes a native module. Keep its compiler toolchain in the build
# stage only so it is not part of the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install -g corepack@latest \
    && corepack enable \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run build \
    && corepack pnpm prune --prod

FROM node:22-bookworm-slim AS runtime

RUN groupadd --system --gid 10001 assetmaster \
    && useradd --system --uid 10001 --gid assetmaster --home-dir /app --shell /usr/sbin/nologin assetmaster \
    && install -d --owner=assetmaster --group=assetmaster --mode=0750 /data/assetmaster

WORKDIR /app
COPY --from=build --chown=assetmaster:assetmaster /app/package.json ./package.json
COPY --from=build --chown=assetmaster:assetmaster /app/node_modules ./node_modules
COPY --from=build --chown=assetmaster:assetmaster /app/dist ./dist
COPY --from=build --chown=assetmaster:assetmaster /app/drizzle ./drizzle
COPY --from=build --chown=assetmaster:assetmaster /app/docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod 0755 /app/docker/entrypoint.sh

ENV NODE_ENV=production \
    PORT=3000 \
    SELF_HOSTED_RUNTIME_CONFIG_PATH=/data/assetmaster/runtime.json

USER assetmaster
EXPOSE 3000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "dist/index.js"]
