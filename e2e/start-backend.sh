#!/bin/bash
#
# Start the CNaaS backend for e2e testing.
#
# Prerequisites:
#   Build images once from the cnaas-nms repo:
#     cd <your-cnaas-nms>/docker && docker compose build
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend containers..."
docker compose -f "$SCRIPT_DIR/compose.yaml" up -d

echo "Waiting for API to be ready..."
curl --connect-timeout 2 --max-time 5 --retry 15 --retry-delay 3 \
  --retry-all-errors --retry-max-time 60 -ks "https://localhost/api/v1.0/system/version"

echo ""
echo "Backend is ready at https://localhost"
