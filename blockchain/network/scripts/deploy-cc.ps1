# ==============================================================================
# ThreatTrust — Chaincode Lifecycle Deployment Script (PowerShell)
# Packages, installs, approves by all 3 orgs, commits threattrust_cc
# ==============================================================================

$CcName = "threattrust_cc"
$CcVersion = "1.0"
$CcSequence = "2"
$ChannelName = "cti-channel"
$Policy = "OR('BankAMSP.peer','BankBMSP.peer','CERTCMSP.peer')"

Write-Host "`n📦 Packaging chaincode $CcName v$CcVersion..." -ForegroundColor Cyan
docker exec cli peer lifecycle chaincode package "$CcName.tar.gz" `
    --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode `
    --lang golang `
    --label "${CcName}_${CcVersion}"

Write-Host "📥 Installing chaincode on BankA, BankB, and CERTC peers..." -ForegroundColor Yellow
docker exec cli peer lifecycle chaincode install "$CcName.tar.gz"

docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" `
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/peers/peer0.bankb.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" `
    cli peer lifecycle chaincode install "$CcName.tar.gz"

docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" `
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/peers/peer0.certc.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" `
    cli peer lifecycle chaincode install "$CcName.tar.gz"

$PackageId = (docker exec cli peer lifecycle chaincode calculatepackageid "$CcName.tar.gz").Trim()
Write-Host "🔑 Chaincode Package ID: $PackageId" -ForegroundColor DarkGray

Write-Host "✍️ Approving chaincode definition for BankA, BankB, and CERTC..." -ForegroundColor Yellow
docker exec cli peer lifecycle chaincode approveformyorg `
    -o orderer.threattrust.local:7050 `
    --channelID $ChannelName `
    --name $CcName `
    --version $CcVersion `
    --package-id $PackageId `
    --sequence $CcSequence `
    --signature-policy $Policy `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

docker exec -e CORE_PEER_LOCALMSPID="BankBMSP" `
    -e CORE_PEER_ADDRESS="peer0.bankb.threattrust.local:8051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/peers/peer0.bankb.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/users/Admin@bankb.threattrust.local/msp" `
    cli peer lifecycle chaincode approveformyorg `
    -o orderer.threattrust.local:7050 `
    --channelID $ChannelName `
    --name $CcName `
    --version $CcVersion `
    --package-id $PackageId `
    --sequence $CcSequence `
    --signature-policy $Policy `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

docker exec -e CORE_PEER_LOCALMSPID="CERTCMSP" `
    -e CORE_PEER_ADDRESS="peer0.certc.threattrust.local:9051" `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/peers/peer0.certc.threattrust.local/tls/ca.crt" `
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/users/Admin@certc.threattrust.local/msp" `
    cli peer lifecycle chaincode approveformyorg `
    -o orderer.threattrust.local:7050 `
    --channelID $ChannelName `
    --name $CcName `
    --version $CcVersion `
    --package-id $PackageId `
    --sequence $CcSequence `
    --signature-policy $Policy `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem

Write-Host "🚀 Committing chaincode definition to $ChannelName..." -ForegroundColor Cyan
docker exec cli peer lifecycle chaincode commit `
    -o orderer.threattrust.local:7050 `
    --channelID $ChannelName `
    --name $CcName `
    --version $CcVersion `
    --sequence $CcSequence `
    --signature-policy $Policy `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem `
    --peerAddresses peer0.banka.threattrust.local:7051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banka.threattrust.local/peers/peer0.banka.threattrust.local/tls/ca.crt `
    --peerAddresses peer0.bankb.threattrust.local:8051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bankb.threattrust.local/peers/peer0.bankb.threattrust.local/tls/ca.crt `
    --peerAddresses peer0.certc.threattrust.local:9051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/certc.threattrust.local/peers/peer0.certc.threattrust.local/tls/ca.crt

Write-Host "🎉 Initializing Genesis Ledger State..." -ForegroundColor Yellow
docker exec cli peer chaincode invoke `
    -o orderer.threattrust.local:7050 `
    --channelID $ChannelName `
    --name $CcName `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/threattrust.local/orderers/orderer.threattrust.local/msp/tlscacerts/tlsca.threattrust.local-cert.pem `
    -c '{"function":"InitLedger","Args":[]}'

Write-Host "`n✅ Chaincode $CcName is successfully deployed on $ChannelName!`n" -ForegroundColor Green
