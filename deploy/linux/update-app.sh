#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/jiandanwenda_robot}"
SERVICE_NAME="${SERVICE_NAME:-jiandanwenda}"
BRANCH="${BRANCH:-main}"

echo "==> Deploy directory: ${APP_DIR}"
echo "==> Branch: ${BRANCH}"

if [ ! -d "${APP_DIR}" ]; then
  echo "Deployment directory does not exist: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

if [ ! -d ".git" ]; then
  echo "Current directory is not a git repository: ${APP_DIR}" >&2
  exit 1
fi

echo "==> Fetch latest source"
git fetch origin "${BRANCH}"

echo "==> Switch to target branch"
git checkout "${BRANCH}"

echo "==> Pull latest commit"
git pull --ff-only origin "${BRANCH}"

echo "==> Install dependencies"
npm ci

echo "==> Build production files"
npm run build

echo "==> Restart systemd service"
sudo systemctl restart "${SERVICE_NAME}"

echo "==> Service status"
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "==> Health check"
curl --fail --silent http://127.0.0.1:3001/api/health || true

echo
echo "Deployment finished successfully."
