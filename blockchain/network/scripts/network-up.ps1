# ==============================================================================
# ThreatTrust — Hyperledger Fabric Network Up Script (PowerShell)
# Launches 3 Orgs (BankA, BankB, CERTC), Orderer, and CLI container
# ==============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkDir = Split-Path -Parent $ScriptDir

Write-Host "`n🛡️  Starting ThreatTrust Hyperledger Fabric Network (Windows/PowerShell)..." -ForegroundColor Cyan

Set-Location $NetworkDir

# Check Docker
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker is not installed or running. Please ensure Docker Desktop is started." -ForegroundColor Red
    exit 1
}

# Ensure directories
if (-not (Test-Path "channel-artifacts")) {
    New-Item -ItemType Directory -Path "channel-artifacts" | Out-Null
}

Write-Host "🚀 Launching Fabric 2.5 Orderer, BankA, BankB, CERTC peers, and CLI container..." -ForegroundColor Yellow
docker compose -f docker-compose-net.yaml up -d

Write-Host "⏳ Waiting 5 seconds for nodes to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 5

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n✅ ThreatTrust Fabric Network is running!`n" -ForegroundColor Green
