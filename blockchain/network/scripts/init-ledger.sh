#!/usr/bin/env bash
set -e

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem
BANKA_TLS_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banka.threattrust.local/peers/peer0.banka.threattrust.local/tls/ca.crt

echo "Initializing Genesis Ledger State via InitLedger..."
peer chaincode invoke \
  -o orderer.threattrust.local:7050 \
  --channelID cti-channel \
  --name threattrust_cc \
  --tls \
  --cafile "$ORDERER_CA" \
  --peerAddresses peer0.banka.threattrust.local:7051 \
  --tlsRootCertFiles "$BANKA_TLS_CA" \
  -c '{"function":"InitLedger","Args":[]}'

echo "Querying GetOrganization for org-banka..."
peer chaincode query \
  -C cti-channel \
  -n threattrust_cc \
  -c '{"Args":["GetOrganization","org-banka"]}'

echo "Querying GetOrganization for org-bankb..."
peer chaincode query \
  -C cti-channel \
  -n threattrust_cc \
  -c '{"Args":["GetOrganization","org-bankb"]}'

echo "Querying GetOrganization for org-certc..."
peer chaincode query \
  -C cti-channel \
  -n threattrust_cc \
  -c '{"Args":["GetOrganization","org-certc"]}'
