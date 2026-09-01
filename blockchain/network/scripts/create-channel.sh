#!/usr/bin/env bash
# ==============================================================================
# ThreatTrust — Channel Creation and Join Script (Bash)
# Creates cti-channel and joins BankA, BankB, and CERTC peers
# ==============================================================================

set -e

CHANNEL_NAME="cti-channel"

echo "🌐 Creating channel: $CHANNEL_NAME"

# 1. Create channel through BankA CLI
docker exec cli peer channel create \
    -o orderer.threattrust.local:7050 \
    -c "$CHANNEL_NAME" \
    -f ./channel-artifacts/channel.tx \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

echo "🤝 Joining BankA peer to $CHANNEL_NAME..."
docker exec cli peer channel join -b "$CHANNEL_NAME.block"

echo "🤝 Joining BankB peer to $CHANNEL_NAME..."
docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" \
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" \
    cli peer channel join -b "$CHANNEL_NAME.block"

echo "🤝 Joining CERTC peer to $CHANNEL_NAME..."
docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" \
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" \
    cli peer channel join -b "$CHANNEL_NAME.block"

echo "✅ All 3 organizations successfully joined $CHANNEL_NAME."
