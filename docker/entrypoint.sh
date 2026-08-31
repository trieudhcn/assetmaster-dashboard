#!/bin/sh
set -eu

load_secret() {
  variable="$1"
  secret_file="$(printenv "${variable}_FILE" 2>/dev/null || true)"

  if [ -z "$secret_file" ]; then
    return 0
  fi

  if [ ! -r "$secret_file" ]; then
    echo "AssetMaster: không thể đọc Docker secret cho ${variable}." >&2
    exit 1
  fi

  secret_value="$(cat "$secret_file")"
  if [ -z "$secret_value" ]; then
    echo "AssetMaster: Docker secret cho ${variable} đang rỗng." >&2
    exit 1
  fi

  export "${variable}=${secret_value}"
}

load_secret DATABASE_URL
load_secret MYSQL_APP_PASSWORD
load_secret JWT_SECRET
load_secret SELF_HOSTED_SETUP_TOKEN
load_secret REDIS_PASSWORD

if [ -z "${DATABASE_URL:-}" ]; then
  : "${ASSETMASTER_DB_HOST:=mysql}"
  : "${ASSETMASTER_DB_PORT:=3306}"
  : "${ASSETMASTER_DB_NAME:=assetmaster}"
  : "${ASSETMASTER_DB_USER:=assetmaster}"
  : "${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD phải được nạp từ Docker secret}"

  export DATABASE_URL="$(node -e 'const { ASSETMASTER_DB_HOST: host, ASSETMASTER_DB_PORT: port, ASSETMASTER_DB_NAME: name, ASSETMASTER_DB_USER: user, MYSQL_APP_PASSWORD: password } = process.env; console.log(`mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`)')"
fi

if [ -n "${REDIS_PASSWORD:-}" ] && [ -z "${REDIS_URL:-}" ]; then
  : "${REDIS_HOST:=redis}"
  : "${REDIS_PORT:=6379}"
  export REDIS_URL="$(node -e 'const { REDIS_HOST: host, REDIS_PORT: port, REDIS_PASSWORD: password } = process.env; console.log(`redis://:${encodeURIComponent(password)}@${host}:${port}/0`)')"
fi

unset MYSQL_APP_PASSWORD REDIS_PASSWORD

if [ "${ASSETMASTER_AUTO_MIGRATE:-false}" = "true" ]; then
  node /app/docker/migrate.mjs
fi

exec "$@"
