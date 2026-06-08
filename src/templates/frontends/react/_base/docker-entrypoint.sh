#!/bin/sh
set -e

mkdir -p /usr/share/nginx/html/api

cat > /usr/share/nginx/html/api/config <<EOF
{
  "VITE_APP_NAME": "${VITE_APP_NAME:-{{PROJECT_NAME}}}",
  "VITE_API_BASE_URL": "${VITE_API_BASE_URL:-}"
}
EOF

echo "[runtime-config] generated /usr/share/nginx/html/api/config"
cat /usr/share/nginx/html/api/config

exec "$@"
