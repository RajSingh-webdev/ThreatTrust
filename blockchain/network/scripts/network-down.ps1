# ==============================================================================
# ThreatTrust — Hyperledger Fabric Network Down Script (PowerShell)
# Stops and removes all Fabric containers, networks, and volumes
# ==============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkDir = Split-Path -Parent $ScriptDir

Write-Host "`n🛑 Tearing down ThreatTrust Hyperledger Fabric Network (Windows/PowerShell)..." -ForegroundColor Yellow

Set-Location $NetworkDir

if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    docker compose -f docker-compose-net.yaml down --volumes --remove-orphans
}

Write-Host "`n🧹 Cleaned up containers and networks.`n✅ ThreatTrust Fabric Network is DOWN.`n" -ForegroundColor Green
