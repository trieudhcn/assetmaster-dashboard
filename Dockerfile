FROM node:22-bookworm-slim

# Argon2 includes a native module. Build tools are retained so pnpm can compile it
# if a matching prebuilt binary is unavailable for the target architecture.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install -g corepack@latest \
    && corepack enable \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run build \
    && chmod +x /app/docker/entrypoint.sh \
    && mkdir -p /data/assetmaster

ENV NODE_ENV=production \
    PORT=3000 \
    SELF_HOSTED_RUNTIME_CONFIG_PATH=/data/assetmaster/runtime.json

EXPOSE 3000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "dist/index.js"]
