package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ThreatTrustContract defines the Hyperledger Fabric Smart Contract for CTI sharing.
type ThreatTrustContract struct {
	contractapi.Contract
}

// Organization represents a permissioned consortium member on the Fabric ledger.
type Organization struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	OrgType         string `json:"org_type"`
	FabricMSPID     string `json:"fabric_msp_id"`
	ReputationScore int    `json:"reputation_score"`
	Status          string `json:"status"`
	CreatedAtUnix   int64  `json:"created_at_unix"`
}

// EndorsementState represents a peer validation decision anchored to an indicator.
type EndorsementState struct {
	ID            string `json:"id"`
	IoCID         string `json:"ioc_id"`
	OrgID         string `json:"organization_id"`
	Decision      string `json:"decision"` // endorse, reject, flag
	Reason        string `json:"reason,omitempty"`
	CreatedAtUnix int64  `json:"created_at_unix"`
	TxID          string `json:"tx_id"`
}

// IoCRecord represents the blockchain-backed immutable threat state.
type IoCRecord struct {
	ID                 string             `json:"id"`
	IoCType            string             `json:"ioc_type"`
	NormalizedValue    string             `json:"normalized_value"`
	ContributorOrgID   string             `json:"contributor_org_id"`
	Status             string             `json:"status"` // pending, verified, rejected, flagged
	ConfidenceScore    int                `json:"confidence_score"`
	ReputationAtSubmit int                `json:"reputation_at_submit"`
	TLPLevel           string             `json:"tlp_level"`
	IntegrityHash      string             `json:"integrity_hash"`
	CreatedAtUnix      int64              `json:"created_at_unix"`
	UpdatedAtUnix      int64              `json:"updated_at_unix"`
	BlockchainTxID     string             `json:"blockchain_tx_id"`
	Endorsements       []EndorsementState `json:"endorsements"`
}

// ReputationEventRecord logs score mutation events on-chain.
type ReputationEventRecord struct {
	ID            string `json:"id"`
	OrgID         string `json:"organization_id"`
	ScoreDelta    int    `json:"score_delta"`
	PreviousScore int    `json:"previous_score"`
	NewScore      int    `json:"new_score"`
	Reason        string `json:"reason"`
	RelatedIoCID  string `json:"related_ioc_id,omitempty"`
	CreatedAtUnix int64  `json:"created_at_unix"`
	TxID          string `json:"tx_id"`
}

// DuplicateCheckResult contains the duplicate status and existing IoC ID.
type DuplicateCheckResult struct {
	IsDuplicate bool   `json:"is_duplicate"`
	ExistingID  string `json:"existing_id"`
}

// IntegrityCheckResult contains cryptographic integrity verification verdict.
type IntegrityCheckResult struct {
	Match       bool   `json:"match"`
	OnChainHash string `json:"on_chain_hash"`
}

// Helper: Composite key prefixes
const (
	OrgPrefix         = "ORG_"
	IoCPrefix         = "IOC_"
	DuplicatePrefix   = "DUP_"
	EndorsementPrefix = "END_"
	ReputationPrefix  = "REP_"
)

// InitLedger initializes the genesis state with BankA, BankB, and CERTC.
func (c *ThreatTrustContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	genesisOrgs := []Organization{
		{ID: "org-banka", Name: "BankA", OrgType: "bank", FabricMSPID: "BankAMSP", ReputationScore: 50, Status: "active", CreatedAtUnix: 1705309200},
		{ID: "org-bankb", Name: "BankB", OrgType: "bank", FabricMSPID: "BankBMSP", ReputationScore: 50, Status: "active", CreatedAtUnix: 1705309200},
		{ID: "org-certc", Name: "CERTC", OrgType: "cert", FabricMSPID: "CERTCMSP", ReputationScore: 50, Status: "active", CreatedAtUnix: 1705309200},
	}

	for _, org := range genesisOrgs {
		orgBytes, err := json.Marshal(org)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(OrgPrefix+org.ID, orgBytes)
		if err != nil {
			return fmt.Errorf("failed to put genesis org %s: %v", org.ID, err)
		}
	}

	return nil
}

// 1. RegisterOrganization registers an authorized consortium member node.
func (c *ThreatTrustContract) RegisterOrganization(
	ctx contractapi.TransactionContextInterface,
	orgID string,
	name string,
	orgType string,
	fabricMspID string,
	createdAtUnix int64,
) (*Organization, error) {
	exists, err := ctx.GetStub().GetState(OrgPrefix + orgID)
	if err != nil {
		return nil, err
	}
	if exists != nil {
		return nil, fmt.Errorf("organization %s is already registered", orgID)
	}

	org := Organization{
		ID:              orgID,
		Name:            name,
		OrgType:         orgType,
		FabricMSPID:     fabricMspID,
		ReputationScore: 50,
		Status:          "active",
		CreatedAtUnix:   createdAtUnix,
	}

	orgBytes, err := json.Marshal(org)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(OrgPrefix+orgID, orgBytes)
	if err != nil {
		return nil, err
	}

	return &org, nil
}

// 2. CheckDuplicate checks if (ioc_type + normalized_value) is already on the ledger.
func (c *ThreatTrustContract) CheckDuplicate(
	ctx contractapi.TransactionContextInterface,
	iocType string,
	normalizedValue string,
) (*DuplicateCheckResult, error) {
	key := fmt.Sprintf("%s%s_%s", DuplicatePrefix, strings.ToLower(iocType), strings.ToLower(normalizedValue))
	existingIoCIDBytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, err
	}
	if existingIoCIDBytes != nil {
		return &DuplicateCheckResult{
			IsDuplicate: true,
			ExistingID:  string(existingIoCIDBytes),
		}, nil
	}
	return &DuplicateCheckResult{
		IsDuplicate: false,
		ExistingID:  "",
	}, nil
}

// 3. SubmitIoC anchors a new threat intelligence indicator to the Fabric ledger.
func (c *ThreatTrustContract) SubmitIoC(
	ctx contractapi.TransactionContextInterface,
	iocID string,
	iocType string,
	normalizedValue string,
	contributorOrgID string,
	tlpLevel string,
	integrityHash string,
	createdAtUnix int64,
) (*IoCRecord, error) {
	// Verify contributor organization exists and check reputation (< 30 restriction)
	orgBytes, err := ctx.GetStub().GetState(OrgPrefix + contributorOrgID)
	if err != nil {
		return nil, err
	}
	if orgBytes == nil {
		return nil, fmt.Errorf("contributor organization %s not found on ledger", contributorOrgID)
	}

	var org Organization
	if err := json.Unmarshal(orgBytes, &org); err != nil {
		return nil, err
	}

	if org.ReputationScore < 30 {
		return nil, fmt.Errorf("submission restricted: organization reputation score (%d) is below the minimum threshold (30)", org.ReputationScore)
	}

	// Check Duplicate Key: (ioc_type, normalized_value)
	dupKey := fmt.Sprintf("%s%s_%s", DuplicatePrefix, strings.ToLower(iocType), strings.ToLower(normalizedValue))
	existingDup, err := ctx.GetStub().GetState(dupKey)
	if err != nil {
		return nil, err
	}
	if existingDup != nil {
		return nil, fmt.Errorf("duplicate indicator detected on ledger (existing IoC ID: %s)", string(existingDup))
	}

	txID := ctx.GetStub().GetTxID()

	ioc := IoCRecord{
		ID:                 iocID,
		IoCType:            iocType,
		NormalizedValue:    normalizedValue,
		ContributorOrgID:   contributorOrgID,
		Status:             "pending",
		ConfidenceScore:    0,
		ReputationAtSubmit: org.ReputationScore,
		TLPLevel:           tlpLevel,
		IntegrityHash:      integrityHash,
		CreatedAtUnix:      createdAtUnix,
		UpdatedAtUnix:      createdAtUnix,
		BlockchainTxID:     txID,
		Endorsements:       []EndorsementState{},
	}

	iocBytes, err := json.Marshal(ioc)
	if err != nil {
		return nil, err
	}

	// Put IoC state
	if err := ctx.GetStub().PutState(IoCPrefix+iocID, iocBytes); err != nil {
		return nil, err
	}

	// Put Duplicate Index
	if err := ctx.GetStub().PutState(dupKey, []byte(iocID)); err != nil {
		return nil, err
	}

	// Emit IoCSubmitted event
	_ = ctx.GetStub().SetEvent("IoCSubmitted", iocBytes)

	return &ioc, nil
}

// 4. EndorseIoC records a peer review decision and triggers auto-verification at 2/2 threshold.
func (c *ThreatTrustContract) EndorseIoC(
	ctx contractapi.TransactionContextInterface,
	iocID string,
	endorserOrgID string,
	decision string,
	reason string,
	createdAtUnix int64,
) (*IoCRecord, error) {
	iocBytes, err := ctx.GetStub().GetState(IoCPrefix + iocID)
	if err != nil {
		return nil, err
	}
	if iocBytes == nil {
		return nil, fmt.Errorf("indicator %s not found on ledger", iocID)
	}

	var ioc IoCRecord
	if err := json.Unmarshal(iocBytes, &ioc); err != nil {
		return nil, err
	}

	// Strict Anti-Sybil rule: Submitter cannot self-endorse
	if ioc.ContributorOrgID == endorserOrgID {
		return nil, fmt.Errorf("self-endorsement prohibited: organization %s cannot endorse its own indicator", endorserOrgID)
	}

	// Check if already reviewed by this organization
	for _, existing := range ioc.Endorsements {
		if existing.OrgID == endorserOrgID {
			return nil, fmt.Errorf("organization %s has already submitted an endorsement (%s) for indicator %s", endorserOrgID, existing.Decision, iocID)
		}
	}

	txID := ctx.GetStub().GetTxID()

	endorsement := EndorsementState{
		ID:            fmt.Sprintf("end_%s_%s", iocID, endorserOrgID),
		IoCID:         iocID,
		OrgID:         endorserOrgID,
		Decision:      decision,
		Reason:        reason,
		CreatedAtUnix: createdAtUnix,
		TxID:          txID,
	}

	ioc.Endorsements = append(ioc.Endorsements, endorsement)
	ioc.UpdatedAtUnix = createdAtUnix

	if decision == "endorse" {
		endorseCount := 0
		for _, e := range ioc.Endorsements {
			if e.Decision == "endorse" {
				endorseCount++
			}
		}
		ioc.ConfidenceScore = endorseCount

		// 2 Independent Endorsements Consensus Threshold -> VERIFIED
		if endorseCount >= 2 && ioc.Status == "pending" {
			ioc.Status = "verified"

			// Award +1 reputation to contributor organization
			orgBytes, err := ctx.GetStub().GetState(OrgPrefix + ioc.ContributorOrgID)
			if err == nil && orgBytes != nil {
				var contribOrg Organization
				if err := json.Unmarshal(orgBytes, &contribOrg); err == nil {
					contribOrg.ReputationScore = contribOrg.ReputationScore + 1
					if contribOrg.ReputationScore > 100 {
						contribOrg.ReputationScore = 100
					}
					updatedOrgBytes, _ := json.Marshal(contribOrg)
					_ = ctx.GetStub().PutState(OrgPrefix+ioc.ContributorOrgID, updatedOrgBytes)
				}
			}

			_ = ctx.GetStub().SetEvent("IoCVerified", []byte(fmt.Sprintf(`{"ioc_id":"%s","status":"verified"}`, iocID)))
		}
	} else if decision == "reject" {
		rejectCount := 0
		for _, e := range ioc.Endorsements {
			if e.Decision == "reject" {
				rejectCount++
			}
		}
		if rejectCount >= 2 && ioc.Status == "pending" {
			ioc.Status = "rejected"

			// Apply -3 penalty to submitter for confirmed false report
			orgBytes, err := ctx.GetStub().GetState(OrgPrefix + ioc.ContributorOrgID)
			if err == nil && orgBytes != nil {
				var contribOrg Organization
				if err := json.Unmarshal(orgBytes, &contribOrg); err == nil {
					contribOrg.ReputationScore = contribOrg.ReputationScore - 3
					if contribOrg.ReputationScore < 0 {
						contribOrg.ReputationScore = 0
					}
					updatedOrgBytes, _ := json.Marshal(contribOrg)
					_ = ctx.GetStub().PutState(OrgPrefix+ioc.ContributorOrgID, updatedOrgBytes)
				}
			}

			_ = ctx.GetStub().SetEvent("IoCRejected", []byte(fmt.Sprintf(`{"ioc_id":"%s","status":"rejected"}`, iocID)))
		}
	} else if decision == "flag" {
		if ioc.Status == "pending" {
			ioc.Status = "flagged"
		}
	}

	updatedBytes, err := json.Marshal(ioc)
	if err != nil {
		return nil, err
	}

	if err := ctx.GetStub().PutState(IoCPrefix+iocID, updatedBytes); err != nil {
		return nil, err
	}

	return &ioc, nil
}

// 5. VerifyIoC updates the final state of an indicator directly.
func (c *ThreatTrustContract) VerifyIoC(
	ctx contractapi.TransactionContextInterface,
	iocID string,
	finalStatus string,
) (*IoCRecord, error) {
	iocBytes, err := ctx.GetStub().GetState(IoCPrefix + iocID)
	if err != nil {
		return nil, err
	}
	if iocBytes == nil {
		return nil, fmt.Errorf("indicator %s not found on ledger", iocID)
	}

	var ioc IoCRecord
	if err := json.Unmarshal(iocBytes, &ioc); err != nil {
		return nil, err
	}

	ioc.Status = finalStatus
	updatedBytes, err := json.Marshal(ioc)
	if err != nil {
		return nil, err
	}

	if err := ctx.GetStub().PutState(IoCPrefix+iocID, updatedBytes); err != nil {
		return nil, err
	}

	return &ioc, nil
}

// 6. UpdateReputation modifies organization score and anchors the reputation mutation event.
func (c *ThreatTrustContract) UpdateReputation(
	ctx contractapi.TransactionContextInterface,
	orgID string,
	delta int,
	reason string,
	relatedIoCID string,
	createdAtUnix int64,
) (*Organization, error) {
	orgBytes, err := ctx.GetStub().GetState(OrgPrefix + orgID)
	if err != nil {
		return nil, err
	}
	if orgBytes == nil {
		return nil, fmt.Errorf("organization %s not found", orgID)
	}

	var org Organization
	if err := json.Unmarshal(orgBytes, &org); err != nil {
		return nil, err
	}

	previousScore := org.ReputationScore
	newScore := previousScore + delta
	if newScore < 0 {
		newScore = 0
	}
	if newScore > 100 {
		newScore = 100
	}

	org.ReputationScore = newScore

	updatedOrgBytes, err := json.Marshal(org)
	if err != nil {
		return nil, err
	}

	if err := ctx.GetStub().PutState(OrgPrefix+orgID, updatedOrgBytes); err != nil {
		return nil, err
	}

	// Record Reputation Mutation Event
	txID := ctx.GetStub().GetTxID()
	event := ReputationEventRecord{
		ID:            fmt.Sprintf("rep_%s_%d", orgID, createdAtUnix),
		OrgID:         orgID,
		ScoreDelta:    delta,
		PreviousScore: previousScore,
		NewScore:      newScore,
		Reason:        reason,
		RelatedIoCID:  relatedIoCID,
		CreatedAtUnix: createdAtUnix,
		TxID:          txID,
	}

	eventBytes, _ := json.Marshal(event)
	_ = ctx.GetStub().PutState(fmt.Sprintf("%s%s_%s", ReputationPrefix, orgID, txID), eventBytes)
	_ = ctx.GetStub().SetEvent("ReputationUpdated", eventBytes)

	return &org, nil
}

// 7. FlagIoC sets an indicator's status to flagged.
func (c *ThreatTrustContract) FlagIoC(
	ctx contractapi.TransactionContextInterface,
	iocID string,
	reason string,
) (*IoCRecord, error) {
	iocBytes, err := ctx.GetStub().GetState(IoCPrefix + iocID)
	if err != nil {
		return nil, err
	}
	if iocBytes == nil {
		return nil, fmt.Errorf("indicator %s not found", iocID)
	}

	var ioc IoCRecord
	if err := json.Unmarshal(iocBytes, &ioc); err != nil {
		return nil, err
	}

	ioc.Status = "flagged"
	updatedBytes, _ := json.Marshal(ioc)
	_ = ctx.GetStub().PutState(IoCPrefix+iocID, updatedBytes)

	return &ioc, nil
}

// 8. GetThreat retrieves the on-chain indicator record.
func (c *ThreatTrustContract) GetThreat(
	ctx contractapi.TransactionContextInterface,
	iocID string,
) (*IoCRecord, error) {
	iocBytes, err := ctx.GetStub().GetState(IoCPrefix + iocID)
	if err != nil {
		return nil, err
	}
	if iocBytes == nil {
		return nil, fmt.Errorf("indicator %s not found on ledger", iocID)
	}

	var ioc IoCRecord
	if err := json.Unmarshal(iocBytes, &ioc); err != nil {
		return nil, err
	}

	return &ioc, nil
}

// 9. GetOrganization retrieves organization trust metadata.
func (c *ThreatTrustContract) GetOrganization(
	ctx contractapi.TransactionContextInterface,
	orgID string,
) (*Organization, error) {
	orgBytes, err := ctx.GetStub().GetState(OrgPrefix + orgID)
	if err != nil {
		return nil, err
	}
	if orgBytes == nil {
		return nil, fmt.Errorf("organization %s not found on ledger", orgID)
	}

	var org Organization
	if err := json.Unmarshal(orgBytes, &org); err != nil {
		return nil, err
	}

	return &org, nil
}

// 10. VerifyIntegrity recalculates and compares on-chain integrity hashes.
func (c *ThreatTrustContract) VerifyIntegrity(
	ctx contractapi.TransactionContextInterface,
	iocID string,
	calculatedHash string,
) (*IntegrityCheckResult, error) {
	iocBytes, err := ctx.GetStub().GetState(IoCPrefix + iocID)
	if err != nil {
		return nil, err
	}
	if iocBytes == nil {
		return nil, fmt.Errorf("indicator %s not found", iocID)
	}

	var ioc IoCRecord
	if err := json.Unmarshal(iocBytes, &ioc); err != nil {
		return nil, err
	}

	// Verify using exact serialization formula:
	// ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix
	canonicalInput := fmt.Sprintf("%s|%s|%s|%s|%d", ioc.ID, ioc.IoCType, ioc.NormalizedValue, ioc.ContributorOrgID, ioc.CreatedAtUnix)
	hasher := sha256.New()
	hasher.Write([]byte(canonicalInput))
	expectedHash := hex.EncodeToString(hasher.Sum(nil))

	match := strings.EqualFold(expectedHash, calculatedHash) && strings.EqualFold(ioc.IntegrityHash, calculatedHash)

	return &IntegrityCheckResult{
		Match:       match,
		OnChainHash: ioc.IntegrityHash,
	}, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&ThreatTrustContract{})
	if err != nil {
		fmt.Printf("Error creating ThreatTrust chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting ThreatTrust chaincode: %v\n", err)
	}
}
