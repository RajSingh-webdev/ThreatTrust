#!/usr/bin/env bash
# ==============================================================================
# ThreatTrust — Hyperledger Fabric Network Down Script (Bash)
# Stops and removes all Fabric containers, networks, and volumes
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

echo "🛑 Tearing down ThreatTrust Hyperledger Fabric Network..."

cd "$NETWORK_DIR"

if command -v docker &> /dev/null; then
    docker compose -f docker-compose-net.yaml down --volumes --remove-orphans
fi

echo "🧹 Cleaned up containers and networks."
echo "✅ ThreatTrust Fabric Network is DOWN."
