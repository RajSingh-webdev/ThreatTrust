# Blockchain — Hyperledger Fabric

This directory contains the Hyperledger Fabric network configuration and Go chaincode for ThreatTrust.

> **Status**: Phase 4 — Not yet implemented.
> Blockchain integration begins after the backend and frontend are wired together (Phase 3).

---

## Structure

```
blockchain/
├── chaincode/          # Go chaincode (threattrust-cc)
│   ├── go.mod
│   ├── go.sum
│   └── threattrust/
│       └── chaincode.go
├── network/            # Fabric network config
│   ├── configtx.yaml   # Channel + org config
│   ├── crypto-config.yaml
│   └── docker-compose-fabric.yml
└── scripts/
    ├── network-up.sh   # Start Fabric network
    ├── network-down.sh # Stop and clean up
    └── deploy-cc.sh    # Install + instantiate chaincode
```

---

## Planned Fabric Network

| Component | Details |
|-----------|---------|
| Fabric version | 2.5 |
| Orgs | BankA, BankB, CERTC |
| MSPs | BankAMSP, BankBMSP, CERTCMSP |
| Channel | `threattrust-channel` |
| Chaincode | `threattrust-cc` (Go) |
| Orderer | RAFT single-orderer (prototype) |
| Crypto | `cryptogen` (prototype-grade) |

---

## Planned Chaincode Functions

```go
RegisterOrganization(orgID, name, mspID)
SubmitIoC(iocID, iocType, normalizedValueHash, contributorOrgID, integrityHash)
CheckDuplicate(iocType, normalizedValueHash)
EndorseIoC(iocID, endorserOrgID, decision, reason)
VerifyIoC(iocID)
UpdateReputation(orgID, delta, relatedIocID)
FlagIoC(iocID, flaggerOrgID, reason)
GetThreat(iocID)
GetOrganization(orgID)
VerifyIntegrity(iocID, currentHash)
```

---

## Fallback

If Fabric setup becomes a genuine time blocker, the fallback is:
- **Hardhat** (local EVM) + **Solidity** smart contracts
- Same function signatures, re-expressed as Solidity
- This fallback is only triggered if Fabric cannot be running end-to-end during Phase 4

---

## Setup (Phase 4)

```bash
# Prerequisites: Docker, Go 1.21+, Fabric binaries (fabric-samples)

# Start the network
bash blockchain/scripts/network-up.sh

# Deploy chaincode
bash blockchain/scripts/deploy-cc.sh

# Stop the network
bash blockchain/scripts/network-down.sh
```
