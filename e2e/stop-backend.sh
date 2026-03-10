#!/bin/bash
#
# Stop the CNaaS backend e2e containers.
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping backend containers..."
docker compose -f "$SCRIPT_DIR/compose.yaml" down -v -t 3

echo "Backend stopped."
