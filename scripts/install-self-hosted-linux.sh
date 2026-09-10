#!/usr/bin/env bash
# AssetMaster native Ubuntu installer (no Docker)
# Run with sudo from a checked-out release, for example:
#   sudo bash scripts/install-self-hosted-linux.sh --source-dir "$PWD"

set -Eeuo pipefail
IFS=$'\n\t'

APP_NAME="assetmaster"
APP_USER="assetmaster"
APP_GROUP="assetmaster"
APP_DIR="/opt/assetmaster/app"
CONFIG_DIR="/etc/assetmaster"
SECRET_DIR="${CONFIG_DIR}/secrets"
DATA_DIR="/var/lib/assetmaster"
LOG_DIR="/var/log/assetmaster"
FILES_DIR="/srv/assetmaster/files"
BACKUP_DIR="/srv/assetmaster/backups/mysql"
MYSQL_DB="assetmaster"
MYSQL_USER="assetmaster"
SOURCE_DIR=""
DOMAIN=""
LETS_ENCRYPT_EMAIL=""
ENABLE_LETS_ENCRYPT="false"
LDAP_BIND_PASSWORD_SOURCE=""

usage() {
  cat <<'USAGE'
AssetMaster native Ubuntu installer (no Docker)

Usage:
  sudo bash scripts/install-self-hosted-linux.sh --source-dir /path/to/source [options]

Options:
  --source-dir PATH        Extracted or Git-cloned AssetMaster source (required).
  --domain FQDN            Public FQDN for Nginx, e.g. assetmaster.example.com (required).
  --letsencrypt-email MAIL Email for Let’s Encrypt expiry notices; enables issuance.
  --ldap-bind-password-file PATH
                           Optional regular file containing the LDAPS bind password. It is copied
                           as /etc/assetmaster/secrets/assetmaster_ldap_bind_password (root:assetmaster, 0640).
  --no-letsencrypt         Keep Nginx HTTP-only so an internal PKI certificate can be installed later.
  --help                   Show this help text.

Safety:
  * This script never runs `rm -rf`, `docker compose down -v`, `DROP DATABASE`, or a volume-delete command.
  * It creates or reuses the `assetmaster` database/user and keeps existing database/files.
  * Do not use Let’s Encrypt unless the FQDN resolves publicly to this server and TCP port 80 is reachable.
USAGE
}

die() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

notice() {
  printf '\n==> %s\n' "$*"
}

need_root() {
  [[ "${EUID}" -eq 0 ]] || die "Hãy chạy script bằng sudo hoặc root."
}

valid_domain() {
  [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]
}

valid_email() {
  [[ "$1" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]
}

prompt_if_empty() {
  local variable_name="$1"
  local prompt="$2"
  local value="${!variable_name:-}"
  while [[ -z "$value" ]]; do
    read -r -p "$prompt: " value
  done
  printf -v "$variable_name" '%s' "$value"
}

confirm() {
  local answer
  read -r -p "Script sẽ cài service và tạo cấu hình trên máy chủ này. Tiếp tục? [yes/NO]: " answer
  [[ "$answer" == "yes" ]] || die "Đã hủy. Không có dữ liệu nào bị xóa."
}

write_secret() {
  local path="$1"
  local value="$2"
  install -d -m 0750 -o root -g "${APP_GROUP}" "$SECRET_DIR"
  printf '%s' "$value" > "$path"
  chown root:"${APP_GROUP}" "$path"
  chmod 0640 "$path"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir)
      SOURCE_DIR="${2:-}"
      shift 2
      ;;
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --letsencrypt-email)
      LETS_ENCRYPT_EMAIL="${2:-}"
      ENABLE_LETS_ENCRYPT="true"
      shift 2
      ;;
    --ldap-bind-password-file)
      LDAP_BIND_PASSWORD_SOURCE="${2:-}"
      shift 2
      ;;
    --no-letsencrypt)
      ENABLE_LETS_ENCRYPT="false"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Tùy chọn không hợp lệ: $1"
      ;;
  esac
done

need_root
prompt_if_empty SOURCE_DIR "Đường dẫn source AssetMaster đã tải về"
prompt_if_empty DOMAIN "FQDN website (ví dụ assetmaster.congty.vn)"
valid_domain "$DOMAIN" || die "FQDN không hợp lệ. Không dùng IP, protocol hoặc dấu gạch dưới."
[[ -f "${SOURCE_DIR}/package.json" && -f "${SOURCE_DIR}/server/_core/index.ts" ]] || die "SOURCE_DIR không phải source AssetMaster hợp lệ."
SOURCE_DIR="$(readlink -f "$SOURCE_DIR")"
if [[ -n "$LDAP_BIND_PASSWORD_SOURCE" ]]; then
  [[ -f "$LDAP_BIND_PASSWORD_SOURCE" && ! -L "$LDAP_BIND_PASSWORD_SOURCE" ]] || die "Tệp bind password LDAPS phải là tệp thường, không phải symlink."
fi

if [[ "$ENABLE_LETS_ENCRYPT" == "true" ]]; then
  valid_email "$LETS_ENCRYPT_EMAIL" || die "Email Let’s Encrypt không hợp lệ."
else
  printf '\nTLS: script chỉ tạo Nginx HTTP. Sau đó hãy dùng Internal PKI, hoặc chạy lại với --letsencrypt-email.\n'
fi

cat <<SUMMARY

Tóm tắt cấu hình:
  Source:          ${SOURCE_DIR}
  Application:     ${APP_DIR}
  FQDN:            ${DOMAIN}
  MySQL database:  ${MYSQL_DB}
  Files:           ${FILES_DIR}
  Backups:         ${BACKUP_DIR}
  Let’s Encrypt:   ${ENABLE_LETS_ENCRYPT}
  LDAPS secret:    $([[ -n "$LDAP_BIND_PASSWORD_SOURCE" ]] && printf 'sẽ sao chép' || printf 'tạo thủ công sau cài đặt')
SUMMARY
confirm

notice "Cập nhật Ubuntu và cài packages cần thiết"
apt update
DEBIAN_FRONTEND=noninteractive apt -y full-upgrade
DEBIAN_FRONTEND=noninteractive apt install -y ca-certificates curl gnupg git openssl \
  nginx ufw jq build-essential python3 make g++ rsync mysql-server redis-server

notice "Cài Node.js 22 LTS và pnpm"
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  rm -f /tmp/nodesource_setup.sh
  DEBIAN_FRONTEND=noninteractive apt install -y nodejs
fi
corepack enable
corepack prepare pnpm@10.15.1 --activate
node --version | grep -q '^v22\.' || die "Node.js 22 chưa được cài đúng."
pnpm --version >/dev/null

notice "Tạo user service và thư mục dữ liệu"
groupadd --system "$APP_GROUP" 2>/dev/null || true
useradd --system --gid "$APP_GROUP" --home-dir "$DATA_DIR" --create-home \
  --shell /usr/sbin/nologin "$APP_USER" 2>/dev/null || true
install -d -m 0750 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR" "$DATA_DIR" "$LOG_DIR" "$FILES_DIR"
install -d -m 0700 -o root -g root "$BACKUP_DIR"
install -d -m 0750 -o root -g "$APP_GROUP" "$CONFIG_DIR" "$SECRET_DIR"
if [[ -n "$LDAP_BIND_PASSWORD_SOURCE" ]]; then
  install -o root -g "$APP_GROUP" -m 0640 "$LDAP_BIND_PASSWORD_SOURCE" "${SECRET_DIR}/assetmaster_ldap_bind_password"
fi

notice "Cấu hình MySQL local-only"
systemctl enable --now mysql
MYSQL_PASSWORD_FILE="${SECRET_DIR}/mysql_app_password"
if [[ ! -s "$MYSQL_PASSWORD_FILE" ]]; then
  write_secret "$MYSQL_PASSWORD_FILE" "$(openssl rand -hex 32)"
fi
MYSQL_PASSWORD="$(cat "$MYSQL_PASSWORD_FILE")"
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO '${MYSQL_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

notice "Cấu hình Redis local-only với password"
systemctl enable --now redis-server
REDIS_PASSWORD_FILE="${SECRET_DIR}/redis_password"
if [[ ! -s "$REDIS_PASSWORD_FILE" ]]; then
  write_secret "$REDIS_PASSWORD_FILE" "$(openssl rand -hex 32)"
fi
REDIS_PASSWORD="$(cat "$REDIS_PASSWORD_FILE")"
[[ -f /etc/redis/redis.conf.assetmaster-original ]] || cp /etc/redis/redis.conf /etc/redis/redis.conf.assetmaster-original
sed -i \
  -e 's/^bind .*/bind 127.0.0.1 ::1/' \
  -e 's/^protected-mode .*/protected-mode yes/' \
  -e 's/^appendonly .*/appendonly yes/' \
  -e '/^requirepass /d' \
  /etc/redis/redis.conf
printf '\n# AssetMaster local-only password\nrequirepass %s\n' "$REDIS_PASSWORD" >> /etc/redis/redis.conf
systemctl restart redis-server
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h 127.0.0.1 ping | grep -qx 'PONG'

notice "Cập nhật source và build AssetMaster"
if [[ "$SOURCE_DIR" != "$APP_DIR" ]]; then
  rsync -a --exclude '.git' --exclude 'node_modules' --exclude 'dist' "$SOURCE_DIR/" "$APP_DIR/"
fi
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && pnpm install --frozen-lockfile && pnpm build"
test -f "${APP_DIR}/dist/index.js" || die "Build AssetMaster không tạo dist/index.js."

notice "Tạo secrets và environment file"
SETUP_TOKEN_FILE="${SECRET_DIR}/setup_token"
JWT_SECRET_FILE="${SECRET_DIR}/jwt_secret"
[[ -s "$SETUP_TOKEN_FILE" ]] || write_secret "$SETUP_TOKEN_FILE" "$(openssl rand -hex 48)"
[[ -s "$JWT_SECRET_FILE" ]] || write_secret "$JWT_SECRET_FILE" "$(openssl rand -hex 48)"
cat > "${CONFIG_DIR}/assetmaster.env" <<EOF
NODE_ENV=production
PORT=3000
SELF_HOSTED_AUTH_ENABLED=true
SELF_HOSTED_SETUP_ENABLED=true
SELF_HOSTED_SETUP_TOKEN=$(cat "$SETUP_TOKEN_FILE")
JWT_SECRET=$(cat "$JWT_SECRET_FILE")
REDIS_URL=redis://:${REDIS_PASSWORD}@127.0.0.1:6379
SELF_HOSTED_RUNTIME_CONFIG_PATH=${DATA_DIR}/runtime.json
SELF_HOSTED_FILE_STORAGE_ROOT=${FILES_DIR}
EOF
chown root:"$APP_GROUP" "${CONFIG_DIR}/assetmaster.env"
chmod 0640 "${CONFIG_DIR}/assetmaster.env"

notice "Cấu hình AssetMaster service systemd"
cat > /etc/systemd/system/assetmaster.service <<EOF
[Unit]
Description=AssetMaster internal application
After=network-online.target mysql.service redis-server.service
Wants=network-online.target
Requires=mysql.service redis-server.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${CONFIG_DIR}/assetmaster.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR} ${LOG_DIR} ${FILES_DIR}

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now assetmaster
systemctl is-active --quiet assetmaster || { journalctl -u assetmaster -n 120 --no-pager; die "AssetMaster service chưa chạy."; }

notice "Cấu hình Nginx reverse proxy"
cat > /etc/nginx/conf.d/assetmaster-rate-limit.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=assetmaster_login:10m rate=5r/m;
EOF
cat > /etc/nginx/sites-available/assetmaster.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    server_tokens off;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location ~ ^/(api|setup|login) {
        limit_req zone=assetmaster_login burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Cache-Control "no-store" always;
    }
}
EOF
ln -sf /etc/nginx/sites-available/assetmaster.conf /etc/nginx/sites-enabled/assetmaster.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

notice "Cấu hình UFW"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 443/tcp
if [[ "$ENABLE_LETS_ENCRYPT" == "true" ]]; then
  ufw allow 80/tcp
fi
ufw --force enable

if [[ "$ENABLE_LETS_ENCRYPT" == "true" ]]; then
  notice "Cài Certbot và yêu cầu certificate Let’s Encrypt"
  apt remove -y certbot 2>/dev/null || true
  apt install -y snapd
  snap list core >/dev/null 2>&1 || snap install core
  snap refresh core
  snap list certbot >/dev/null 2>&1 || snap install --classic certbot
  ln -sf /snap/bin/certbot /usr/local/bin/certbot
  certbot --nginx --non-interactive --agree-tos --redirect \
    --email "$LETS_ENCRYPT_EMAIL" -d "$DOMAIN"
  certbot renew --dry-run
fi

notice "Kiểm tra cuối"
systemctl --no-pager --full status mysql redis-server nginx assetmaster || true
curl -fsSI http://127.0.0.1:3000/ | head -n 1
printf '\nCÀI ĐẶT HỆ ĐIỀU HÀNH HOÀN TẤT.\n'
printf '1. Mở https://%s/setup (hoặc HTTP nếu chưa cấu hình TLS).\n' "$DOMAIN"
printf '2. Lấy Setup Token: sudo cat %s\n' "$SETUP_TOKEN_FILE"
printf '3. Lấy MySQL password cho wizard: sudo cat %s\n' "$MYSQL_PASSWORD_FILE"
printf '4. Sau khi `/setup` thành công, chạy:\n'
printf '   sudo sed -i "s/^SELF_HOSTED_SETUP_ENABLED=.*/SELF_HOSTED_SETUP_ENABLED=false/" %s\n' "${CONFIG_DIR}/assetmaster.env"
printf '   sudo systemctl restart assetmaster\n'
printf '5. Nếu dùng LDAPS, cấu hình Directory UI với tệp secret %s (nếu đã tạo).\n' "${SECRET_DIR}/assetmaster_ldap_bind_password"
printf 'Không xóa %s, %s hoặc %s.\n' "$DATA_DIR" "$FILES_DIR" "$CONFIG_DIR"
