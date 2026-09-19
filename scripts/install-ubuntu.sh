#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Sử dụng:
  sudo ./scripts/install-ubuntu.sh [--env-file PATH] [--prepare-only] [--no-build]

Tùy chọn:
  --env-file PATH  File biến không nhạy cảm (mặc định: .env).
  --prepare-only   Chỉ tạo thư mục, phân quyền và kiểm tra cấu hình/secrets.
  --no-build       Khởi động bằng image hiện có, không build lại app.
EOF
}

fail() {
  printf 'AssetMaster: %s\n' "$*" >&2
  exit 1
}

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${project_dir}/.env"
prepare_only=false
build=true

while (($#)); do
  case "$1" in
    --env-file)
      (($# >= 2)) || fail "--env-file cần một đường dẫn."
      env_file="$2"
      shift 2
      ;;
    --prepare-only)
      prepare_only=true
      shift
      ;;
    --no-build)
      build=false
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      fail "Tùy chọn không hợp lệ: $1"
      ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || fail "hãy chạy script bằng sudo."
[[ -r /etc/os-release ]] || fail "không đọc được /etc/os-release."
# shellcheck disable=SC1091
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || fail "script này chỉ hỗ trợ Ubuntu Server."

for command_name in docker curl grep stat awk; do
  command -v "${command_name}" >/dev/null 2>&1 ||
    fail "thiếu lệnh ${command_name}."
done
docker compose version >/dev/null 2>&1 ||
  fail "chưa cài Docker Compose plugin."
docker info >/dev/null 2>&1 || fail "Docker Engine chưa hoạt động."

[[ -r "${env_file}" ]] ||
  fail "không đọc được ${env_file}; hãy sao chép docker/linux.env.example và chỉnh lại."
env_file="$(cd -- "$(dirname -- "${env_file}")" && pwd)/$(basename -- "${env_file}")"
for required_file in Dockerfile docker-compose.yml docker-compose.linux.yml; do
  [[ -f "${project_dir}/${required_file}" ]] ||
    fail "thiếu ${required_file} trong ${project_dir}."
done

env_value() {
  local key="$1"
  awk -v wanted="${key}" '
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (index(line, wanted "=") == 1) {
        sub("^" wanted "=", "", line)
        value = line
      }
    }
    END {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      print value
    }
  ' "${env_file}"
}

resolved_value() {
  local key="$1"
  local fallback="$2"
  local current="${!key:-}"
  if [[ -z "${current}" ]]; then
    current="$(env_value "${key}")"
  fi
  printf '%s' "${current:-${fallback}}"
}

data_dir="$(resolved_value ASSETMASTER_DATA_DIR /srv/assetmaster/data)"
files_dir="$(resolved_value ASSETMASTER_FILES_DIR /srv/assetmaster/files)"
secrets_dir="$(resolved_value ASSETMASTER_SECRETS_DIR /etc/assetmaster/secrets)"
ca_file="$(resolved_value ASSETMASTER_CA_FILE /etc/assetmaster/certs/company-ca.pem)"
bind_ip="$(resolved_value ASSETMASTER_BIND_IP 127.0.0.1)"
app_port="$(resolved_value ASSETMASTER_PORT 3000)"

for absolute_path in "${data_dir}" "${files_dir}" "${secrets_dir}" "${ca_file}"; do
  [[ "${absolute_path}" == /* ]] ||
    fail "đường dẫn production phải là đường dẫn tuyệt đối: ${absolute_path}"
done
[[ "${app_port}" =~ ^[0-9]+$ ]] && ((app_port >= 1 && app_port <= 65535)) ||
  fail "ASSETMASTER_PORT không hợp lệ."

install -d -m 0755 -o root -g root "${data_dir}"
install -d -m 0750 -o 10001 -g 10001 "${data_dir}/runtime" "${files_dir}"
install -d -m 0750 -o 999 -g 999 "${data_dir}/mysql" "${data_dir}/redis"
install -d -m 0700 -o root -g root "${secrets_dir}" "$(dirname -- "${ca_file}")"

secret_names=(
  mysql_root_password
  mysql_app_password
  redis_password
  jwt_secret
  setup_token
  ldap_bind_password
  entra_client_secret
)

for secret_name in "${secret_names[@]}"; do
  secret_path="${secrets_dir}/${secret_name}.txt"
  [[ -f "${secret_path}" && ! -L "${secret_path}" ]] ||
    fail "secret ${secret_path} phải là file thường và không được là symlink."
  [[ -s "${secret_path}" ]] || fail "secret ${secret_path} đang rỗng."
  if grep -Eiq '^(change[-_ ]?me|replace|password|secret|example)([-_ ].*)?$' "${secret_path}"; then
    fail "secret ${secret_path} vẫn là giá trị mẫu."
  fi
  minimum_length=12
  case "${secret_name}" in
    mysql_root_password | mysql_app_password | redis_password | jwt_secret | setup_token)
      minimum_length=32
      ;;
  esac
  secret_length="$(tr -d '\r\n' < "${secret_path}" | wc -c | tr -d ' ')"
  ((secret_length >= minimum_length)) ||
    fail "secret ${secret_path} phải dài ít nhất ${minimum_length} ký tự."
  chown root:root "${secret_path}"
  chmod 0444 "${secret_path}"
done

[[ -f "${ca_file}" && ! -L "${ca_file}" && -s "${ca_file}" ]] ||
  fail "CA certificate ${ca_file} phải là file PEM thường, không rỗng và không là symlink."
grep -q -- '-----BEGIN CERTIFICATE-----' "${ca_file}" ||
  fail "CA certificate ${ca_file} không có định dạng PEM."
chown root:root "${ca_file}"
chmod 0444 "${ca_file}"

export ASSETMASTER_DATA_DIR="${data_dir}"
export ASSETMASTER_FILES_DIR="${files_dir}"
export ASSETMASTER_SECRETS_DIR="${secrets_dir}"
export ASSETMASTER_CA_FILE="${ca_file}"

compose=(
  docker compose
  --env-file "${env_file}"
  -f "${project_dir}/docker-compose.yml"
  -f "${project_dir}/docker-compose.linux.yml"
)

"${compose[@]}" config --quiet
printf 'AssetMaster: cấu hình Linux, thư mục, CA và 7 secrets hợp lệ.\n'

if [[ "${prepare_only}" == true ]]; then
  exit 0
fi

show_diagnostics() {
  "${compose[@]}" ps || true
  "${compose[@]}" logs --no-color --tail=120 app mysql redis || true
}
trap 'show_diagnostics' ERR

up_arguments=(up -d)
if [[ "${build}" == true ]]; then
  up_arguments+=(--build)
fi
"${compose[@]}" "${up_arguments[@]}"

ready_host="127.0.0.1"
if [[ "${bind_ip}" == "::1" ]]; then
  ready_host="[::1]"
fi
ready_url="http://${ready_host}:${app_port}/readyz"
ready_response="$(mktemp)"
trap 'rm -f -- "${ready_response}"' EXIT

ready=false
for _attempt in $(seq 1 60); do
  if curl --fail --silent --show-error --max-time 5 "${ready_url}" > "${ready_response}"; then
    ready=true
    break
  fi
  sleep 5
done
[[ "${ready}" == true ]] || fail "ứng dụng không đạt readiness sau 300 giây."

"${compose[@]}" exec -T mysql sh -ec \
  'mysqladmin ping -h 127.0.0.1 -u root -p"$(cat /run/secrets/mysql_root_password)" --silent'
"${compose[@]}" exec -T redis sh -ec \
  'redis-cli --no-auth-warning -a "$(cat /run/secrets/redis_password)" ping | grep -qx PONG'

trap - ERR
"${compose[@]}" ps
printf 'AssetMaster: Ubuntu stack đã sẵn sàng tại %s; MySQL và Redis đều phản hồi.\n' "${ready_url}"
