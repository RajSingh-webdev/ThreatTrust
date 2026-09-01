# ==============================================================================
# ThreatTrust — Network Status Script (PowerShell)
# Checks health of all 3 peers, orderer, channel status, and chaincode
# ==============================================================================

$ChannelName = "cti-channel"
$CcName = "threattrust_cc"

Write-Host "`n📊 ThreatTrust Fabric Network Health Status:" -ForegroundColor Cyan
Write-Host "--------------------------------------------------"

if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed or running." -ForegroundColor Red
    exit 1
}

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n🔗 Querying $ChannelName block height:" -ForegroundColor Yellow
docker exec cli peer channel getinfo -c $ChannelName

Write-Host "`n📜 Committed chaincode on $ChannelName:" -ForegroundColor Yellow
docker exec cli peer lifecycle chaincode querycommitted -C $ChannelName

Write-Host "--------------------------------------------------`n"
