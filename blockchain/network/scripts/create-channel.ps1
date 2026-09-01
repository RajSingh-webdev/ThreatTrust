# ==============================================================================
# ThreatTrust — Channel Creation and Join Script (PowerShell)
# Creates cti-channel and joins BankA, BankB, and CERTC peers
# ==============================================================================

$ChannelName = "cti-channel"

Write-Host "`n🌐 Creating Hyperledger Fabric channel: $ChannelName..." -ForegroundColor Cyan

docker exec cli peer channel create `
    -o orderer.threattrust.local:7050 `
    -c $ChannelName `
    -f ./channel-artifacts/channel.tx `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

Write-Host "🤝 Joining BankA peer to $ChannelName..." -ForegroundColor Yellow
docker exec cli peer channel join -b "$ChannelName.block"

Write-Host "🤝 Joining BankB peer to $ChannelName..." -ForegroundColor Yellow
docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" `
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/peers/peer0.bankb.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" `
    cli peer channel join -b "$ChannelName.block"

Write-Host "🤝 Joining CERTC peer to $ChannelName..." -ForegroundColor Yellow
docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" `
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/peers/peer0.certc.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" `
    cli peer channel join -b "$ChannelName.block"

Write-Host "`n✅ All 3 organizations successfully joined $ChannelName.`n" -ForegroundColor Green
