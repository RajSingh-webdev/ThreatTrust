#!/usr/bin/env bash
# ==============================================================================
# ThreatTrust — Chaincode Lifecycle Deployment Script (Bash)
# Packages, installs, approves by all 3 orgs, commits threattrust_cc
# ==============================================================================

set -e

CC_NAME="threattrust_cc"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CHANNEL_NAME="cti-channel"

echo "📦 Packaging chaincode $CC_NAME v$CC_VERSION..."
docker exec cli peer lifecycle chaincode package ${CC_NAME}.tar.gz \
    --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode \
    --lang golang \
    --label ${CC_NAME}_${CC_VERSION}

echo "📥 Installing chaincode on BankA, BankB, and CERTC peers..."
docker exec cli peer lifecycle chaincode install ${CC_NAME}.tar.gz

docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" \
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" \
    cli peer lifecycle chaincode install ${CC_NAME}.tar.gz

docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" \
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" \
    cli peer lifecycle chaincode install ${CC_NAME}.tar.gz

PACKAGE_ID=$(docker exec cli peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)
echo "🔑 Chaincode Package ID: $PACKAGE_ID"

echo "✍️ Approving chaincode definition for BankA..."
docker exec cli peer lifecycle chaincode approveformyorg \
    -o orderer.threattrust.local:7050 \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

echo "✍️ Approving chaincode definition for BankB..."
docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" \
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer.threattrust.local:7050 \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

echo "✍️ Approving chaincode definition for CERTC..."
docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" \
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer.threattrust.local:7050 \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

echo "🚀 Committing chaincode definition to $CHANNEL_NAME..."
docker exec cli peer lifecycle chaincode commit \
    -o orderer.threattrust.local:7050 \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem \
    --peerAddresses peer0.banka.threattrust.local:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banka.threattrust.local/peers/peer0.banka.threattrust.local/tls/ca.crt \
    --peerAddresses peer0.bankb.threattrust.local:8051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/peers/peer0.bankb.threattrust.local/tls/ca.crt \
    --peerAddresses peer0.certc.threattrust.local:9051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/peers/peer0.certc.threattrust.local/tls/ca.crt

echo "🎉 Initializing Genesis Ledger State..."
docker exec cli peer chaincode invoke \
    -o orderer.threattrust.local:7050 \
    --channelID $CHANNEL_NAME \
    --name $CC_NAME \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem \
    -c '{"function":"InitLedger","Args":[]}'

echo "✅ Chaincode $CC_NAME is successfully deployed and initialized on $CHANNEL_NAME."
