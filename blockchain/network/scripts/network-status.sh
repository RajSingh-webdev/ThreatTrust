#!/usr/bin/env bash
# ==============================================================================
# ThreatTrust — Network Status Script (Bash)
# Checks health of all 3 peers, orderer, channel status, and chaincode
# ==============================================================================

set -e

CHANNEL_NAME="cti-channel"
CC_NAME="threattrust_cc"

echo "📊 ThreatTrust Fabric Network Health Status:"
echo "--------------------------------------------------"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not available."
    exit 1
fi

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 Querying $CHANNEL_NAME block height:"
docker exec cli peer channel getinfo -c "$CHANNEL_NAME" || echo "Channel $CHANNEL_NAME not created yet."

echo ""
echo "📜 Committed chaincode on $CHANNEL_NAME:"
docker exec cli peer lifecycle chaincode querycommitted -C "$CHANNEL_NAME" || echo "No chaincode committed."

echo "--------------------------------------------------"
