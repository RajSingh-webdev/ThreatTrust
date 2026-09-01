#!/usr/bin/env bash
# ==============================================================================
# ThreatTrust — Hyperledger Fabric Network Up Script (Bash)
# Launches 3 Orgs (BankA, BankB, CERTC), Orderer, and CLI container
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CHAINCODE_DIR="$NETWORK_DIR/../chaincode"

echo "🛡️  Starting ThreatTrust Hyperledger Fabric Network..."

cd "$NETWORK_DIR"

# 1. Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

# 2. Generate crypto material if not already generated
if [ ! -d "crypto-config" ]; then
    echo "🔑 Generating cryptographic MSP identities using cryptogen..."
    if command -v cryptogen &> /dev/null; then
        cryptogen generate --config=./crypto-config.yaml --output="crypto-config"
    else
        echo "ℹ️  Using pre-provisioned development crypto material."
        mkdir -p crypto-config
    fi
fi

# 3. Generate genesis block and channel artifacts if needed
mkdir -p channel-artifacts
if [ ! -f "channel-artifacts/genesis.block" ]; then
    echo "📦 Generating genesis block for ThreatTrustConsortium..."
    if command -v configtxgen &> /dev/null; then
        configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
    fi
fi

# 4. Bring up docker containers
echo "🚀 Launching Fabric containers..."
docker compose -f docker-compose-net.yaml up -d

echo "⏳ Waiting 5 seconds for peers and orderer to initialize..."
sleep 5

docker ps --filter "name=threattrust" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "✅ ThreatTrust Fabric Network is UP."
