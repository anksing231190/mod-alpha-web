#!/bin/sh
# Runs when the website container starts (nginx runs every script in /docker-entrypoint.d/).
# If WEB_API_BASE_URL is set (e.g. in stage's .env.stage), it replaces the API address that was built into
# config/env.js — so one image works on any address without rebuilding. Empty = keep the built-in address.
set -e
F=/usr/share/nginx/html/config/env.js
if [ -n "${WEB_API_BASE_URL:-}" ]; then
  U="${WEB_API_BASE_URL%/}"
  case "$U" in
    http://*|https://*) ;;
    *) echo "WEB_API_BASE_URL must start with http:// or https:// — ignored" >&2; exit 0 ;;
  esac
  if echo "$U" | grep -Eq '^https?://[A-Za-z0-9.:-]+(/[A-Za-z0-9._/-]*)?$'; then
    sed -i "s#\"API_BASE_URL\":\"[^\"]*\"#\"API_BASE_URL\":\"$U\"#" "$F"
    echo "website API address: $U"
  else
    echo "WEB_API_BASE_URL has unexpected characters — ignored" >&2
  fi
fi
