/**
 * ThreatTrust — Hyperledger Fabric Blockchain Service & Gateway Integration
 *
 * Connects directly to Hyperledger Fabric 2.5 network on `cti-channel` and `threattrust_cc`
 * using the official @hyperledger/fabric-gateway client SDK with mutual TLS and MSP identities.
 *
 * MODES OF OPERATION:
 * 1. REAL FABRIC MODE (When Fabric network is available):
 *    - Connects via gRPC with mutual TLS and MSP signing identities (BankA, BankB, CERTC)
 *    - Submits actual transaction proposals to Fabric Gateway
 *    - Confirms block commitment with the Raft Orderer and Peers
 *    - Returns real Fabric transaction IDs confirmed by the ledger
 *    - Queries actual on-chain ledger state
 *
 * 2. FABRIC UNAVAILABLE MODE (When Fabric network is offline):
 *    - Explicitly marks status as "FABRIC_UNAVAILABLE"
 *    - Sets txId to null (DOES NOT generate fake Fabric transaction IDs)
 *    - Does NOT falsely claim blockchain transaction confirmation
 */

import * as grpc from "@grpc/grpc-js";
import { connect, signers, Contract, Gateway, Network } from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config/env";
import { BlockchainTransactionResult } from "../types";

interface OrgConnection {
  gateway: Gateway;
  client: grpc.Client;
  contract: Contract;
  network: Network;
}

export class BlockchainService {
  private static channelName = config.fabric.channelName || "cti-channel";
  private static chaincodeName = config.fabric.chaincodeName || "threattrust_cc";
  private static connections: Map<string, OrgConnection> = new Map();
  private static isFabricConnected = false;
  private static lastConnectionAttempt = 0;

  /**
   * Resolve an organization ID, UUID, or MSP ID into its canonical Fabric network coordinates.
   */
  public static resolveOrg(orgIdOrMsp = "org-banka"): { mspId: string; domain: string; port: number; ledgerOrgId: string } {
    const norm = (orgIdOrMsp || "").toLowerCase();
    if (norm.includes("bankb") || norm === "org-bankb" || norm.includes("3aaef38a")) {
      return { mspId: "BankBMSP", domain: "bankb.threattrust.local", port: 8051, ledgerOrgId: "org-bankb" };
    } else if (norm.includes("certc") || norm.includes("cert") || norm === "org-certc" || norm.includes("c6aa9b49")) {
      return { mspId: "CERTCMSP", domain: "certc.threattrust.local", port: 9051, ledgerOrgId: "org-certc" };
    }
    return { mspId: "BankAMSP", domain: "banka.threattrust.local", port: 7051, ledgerOrgId: "org-banka" };
  }

  /**
   * Get or create a Fabric Gateway connection for a specific organization.
   */
  private static getOrgConnection(orgIdOrMsp = "org-banka"): OrgConnection | null {
    const { mspId, domain, port } = this.resolveOrg(orgIdOrMsp);

    if (this.connections.has(mspId)) {
      return this.connections.get(mspId)!;
    }

    const cryptoRoot = path.resolve(__dirname, "../../../../blockchain/network/crypto-config");
    const tlsCertPath = path.join(cryptoRoot, `peerOrganizations/${domain}/peers/peer0.${domain}/tls/ca.crt`);
    const signCertPath = path.join(cryptoRoot, `peerOrganizations/${domain}/users/Admin@${domain}/msp/signcerts/Admin@${domain}-cert.pem`);
    const keyPath = path.join(cryptoRoot, `peerOrganizations/${domain}/users/Admin@${domain}/msp/keystore/priv_sk`);

    if (!fs.existsSync(tlsCertPath) || !fs.existsSync(signCertPath) || !fs.existsSync(keyPath)) {
      return null;
    }

    try {
      const tlsCert = fs.readFileSync(tlsCertPath);
      const signCert = fs.readFileSync(signCertPath);
      const keyPem = fs.readFileSync(keyPath);

      const sslCreds = grpc.credentials.createSsl(tlsCert);
      const client = new grpc.Client(`localhost:${port}`, sslCreds, {
        "grpc.ssl_target_name_override": `peer0.${domain}`,
      });

      const privateKey = crypto.createPrivateKey(keyPem);
      const signer = signers.newPrivateKeySigner(privateKey);

      const gateway = connect({
        client,
        identity: {
          mspId,
          credentials: signCert,
        },
        signer,
      });

      const network = gateway.getNetwork(this.channelName);
      const contract = network.getContract(this.chaincodeName);

      const conn: OrgConnection = { gateway, client, contract, network };
      this.connections.set(mspId, conn);
      this.isFabricConnected = true;
      return conn;
    } catch (err: any) {
      console.warn(`[Fabric Gateway] Failed to connect for ${mspId}:`, err.message);
      return null;
    }
  }

  /**
   * Check if real Fabric network is connected and operational.
   */
  public static isConnected(): boolean {
    const conn = this.getOrgConnection("BankAMSP");
    return conn !== null;
  }

  /**
   * Initializes real Fabric Gateway connection if peer is reachable.
   */
  public static async init(): Promise<boolean> {
    const conn = this.getOrgConnection("BankAMSP");
    if (!conn) {
      this.isFabricConnected = false;
      return false;
    }

    try {
      // Quick evaluate test
      await conn.contract.evaluateTransaction("GetOrganization", "org-banka");
      this.isFabricConnected = true;
      return true;
    } catch {
      this.isFabricConnected = false;
      return false;
    }
  }

  /**
   * Submits a transaction via Fabric Gateway and waits for block commit confirmation.
   */
  private static async submitTx(
    orgId: string,
    functionName: string,
    args: string[]
  ): Promise<{ txId: string; blockNumber?: number; payload?: any } | null> {
    const conn = this.getOrgConnection(orgId);
    if (!conn) return null;

    try {
      const proposal = conn.contract.newProposal(functionName, {
        arguments: args,
      });

      const endorsement = await proposal.endorse();
      const commit = await endorsement.submit();
      const status = await commit.getStatus();

      if (!status.successful) {
        throw new Error(`Fabric commit failed with status code ${status.code}`);
      }

      const resultBytes = endorsement.getResult();
      let payload: any = null;
      if (resultBytes && resultBytes.length > 0) {
        try {
          payload = JSON.parse(new TextDecoder().decode(resultBytes));
        } catch {
          payload = new TextDecoder().decode(resultBytes);
        }
      }

      return {
        txId: status.transactionId,
        blockNumber: Number(status.blockNumber),
        payload,
      };
    } catch (err: any) {
      console.warn(`[Fabric Gateway] ${functionName} submission failed:`, err.message);
      return null;
    }
  }

  /**
   * 1. Register Organization on Ledger
   */
  public static async registerOrganization(
    orgId: string,
    name: string,
    fabricMspId: string
  ): Promise<BlockchainTransactionResult> {
    const createdAtUnix = Math.floor(Date.now() / 1000);
    const tx = await this.submitTx(fabricMspId, "RegisterOrganization", [
      orgId,
      name,
      "bank",
      fabricMspId,
      String(createdAtUnix),
    ]);

    if (tx) {
      return {
        txId: tx.txId,
        status: "COMMITTED",
        blockNumber: tx.blockNumber,
        channel: this.channelName,
        chaincode: this.chaincodeName,
        functionName: "RegisterOrganization",
        payload: tx.payload,
      };
    }

    // FABRIC UNAVAILABLE MODE
    return {
      txId: null,
      status: "FABRIC_UNAVAILABLE",
      channel: this.channelName,
      chaincode: this.chaincodeName,
      functionName: "RegisterOrganization",
      payload: null,
    };
  }

  /**
   * 2. Submit IoC to Ledger
   */
  public static async submitIoC(
    iocId: string,
    iocType: string,
    normalizedValue: string,
    contributorOrgId: string,
    tlpLevel = "amber",
    integrityHash?: string,
    createdAtUnix?: number
  ): Promise<BlockchainTransactionResult> {
    const timestamp = String(createdAtUnix || Math.floor(Date.now() / 1000));
    const hash = integrityHash || normalizedValue;
    const org = this.resolveOrg(contributorOrgId);

    const tx = await this.submitTx(org.mspId, "SubmitIoC", [
      iocId,
      iocType,
      normalizedValue,
      org.ledgerOrgId,
      tlpLevel,
      hash,
      timestamp,
    ]);

    if (tx) {
      return {
        txId: tx.txId,
        status: "COMMITTED",
        blockNumber: tx.blockNumber,
        channel: this.channelName,
        chaincode: this.chaincodeName,
        functionName: "SubmitIoC",
        payload: tx.payload,
      };
    }

    // FABRIC UNAVAILABLE MODE
    return {
      txId: null,
      status: "FABRIC_UNAVAILABLE",
      channel: this.channelName,
      chaincode: this.chaincodeName,
      functionName: "SubmitIoC",
      payload: null,
    };
  }

  /**
   * 3. Endorse IoC on Ledger (Consensus State Mutation)
   */
  public static async endorseIoC(
    iocId: string,
    endorserOrgId: string,
    decision: string,
    reason?: string,
    createdAtUnix?: number
  ): Promise<BlockchainTransactionResult> {
    const timestamp = String(createdAtUnix || Math.floor(Date.now() / 1000));
    const org = this.resolveOrg(endorserOrgId);

    const tx = await this.submitTx(org.mspId, "EndorseIoC", [
      iocId,
      org.ledgerOrgId,
      decision,
      reason || "",
      timestamp,
    ]);

    if (tx) {
      return {
        txId: tx.txId,
        status: "COMMITTED",
        blockNumber: tx.blockNumber,
        channel: this.channelName,
        chaincode: this.chaincodeName,
        functionName: "EndorseIoC",
        payload: tx.payload,
      };
    }

    // FABRIC UNAVAILABLE MODE
    return {
      txId: null,
      status: "FABRIC_UNAVAILABLE",
      channel: this.channelName,
      chaincode: this.chaincodeName,
      functionName: "EndorseIoC",
      payload: null,
    };
  }

  /**
   * 4. Verify IoC Status on Ledger
   */
  public static async verifyIoC(
    iocId: string,
    finalStatus: string,
    actorOrgId = "org-banka"
  ): Promise<BlockchainTransactionResult> {
    const org = this.resolveOrg(actorOrgId);
    const tx = await this.submitTx(org.mspId, "VerifyIoC", [iocId, finalStatus]);

    if (tx) {
      return {
        txId: tx.txId,
        status: "COMMITTED",
        blockNumber: tx.blockNumber,
        channel: this.channelName,
        chaincode: this.chaincodeName,
        functionName: "VerifyIoC",
        payload: tx.payload,
      };
    }

    // FABRIC UNAVAILABLE MODE
    return {
      txId: null,
      status: "FABRIC_UNAVAILABLE",
      channel: this.channelName,
      chaincode: this.chaincodeName,
      functionName: "VerifyIoC",
      payload: null,
    };
  }

  /**
   * 5. Update Reputation on Ledger
   */
  public static async updateReputation(
    orgId: string,
    delta: number,
    newScore: number,
    relatedIocId?: string | null,
    createdAtUnix?: number
  ): Promise<BlockchainTransactionResult> {
    const timestamp = String(createdAtUnix || Math.floor(Date.now() / 1000));
    const org = this.resolveOrg(orgId);

    const tx = await this.submitTx(org.mspId, "UpdateReputation", [
      org.ledgerOrgId,
      String(delta),
      "Verified contribution reward",
      relatedIocId || "",
      timestamp,
    ]);

    if (tx) {
      return {
        txId: tx.txId,
        status: "COMMITTED",
        blockNumber: tx.blockNumber,
        channel: this.channelName,
        chaincode: this.chaincodeName,
        functionName: "UpdateReputation",
        payload: tx.payload,
      };
    }

    // FABRIC UNAVAILABLE MODE
    return {
      txId: null,
      status: "FABRIC_UNAVAILABLE",
      channel: this.channelName,
      chaincode: this.chaincodeName,
      functionName: "UpdateReputation",
      payload: null,
    };
  }

  /**
   * 6. Verify Cryptographic Integrity on Ledger
   */
  public static async verifyIntegrity(
    iocId: string,
    calculatedHash: string,
    storedHash?: string,
    orgId = "org-banka"
  ): Promise<{ match: boolean; onChainHash: string | null; status: "PASS" | "FAIL"; fabricConnected: boolean }> {
    const org = this.resolveOrg(orgId);
    const conn = this.getOrgConnection(org.mspId);

    if (conn) {
      try {
        const resultBytes = await conn.contract.evaluateTransaction("VerifyIntegrity", iocId, calculatedHash);
        const parsed = JSON.parse(new TextDecoder().decode(resultBytes));
        return {
          match: Boolean(parsed.match),
          onChainHash: parsed.on_chain_hash || parsed.onChainHash || null,
          status: parsed.match ? "PASS" : "FAIL",
          fabricConnected: true,
        };
      } catch (err: any) {
        console.warn("[Fabric Gateway] VerifyIntegrity query failed:", err.message);
      }
    }

    // When Fabric is unavailable, compare against application database stored hash
    const match = Boolean(storedHash && storedHash.toLowerCase() === calculatedHash.toLowerCase());
    return {
      match,
      onChainHash: storedHash || null,
      status: match ? "PASS" : "FAIL",
      fabricConnected: false,
    };
  }

  /**
   * 7. Query Threat Indicator directly from Ledger
   */
  public static async getThreat(iocId: string, orgId = "org-banka"): Promise<any | null> {
    const org = this.resolveOrg(orgId);
    const conn = this.getOrgConnection(org.mspId);
    if (!conn) return null;

    try {
      const resultBytes = await conn.contract.evaluateTransaction("GetThreat", iocId);
      return JSON.parse(new TextDecoder().decode(resultBytes));
    } catch (err: any) {
      console.warn(`[Fabric Gateway] GetThreat failed for ${iocId}:`, err.message);
      return null;
    }
  }

  /**
   * 8. Query Organization metadata directly from Ledger
   */
  public static async getOrganization(orgId: string): Promise<any | null> {
    const org = this.resolveOrg(orgId);
    const conn = this.getOrgConnection(org.mspId);
    if (!conn) return null;

    try {
      const resultBytes = await conn.contract.evaluateTransaction("GetOrganization", org.ledgerOrgId);
      return JSON.parse(new TextDecoder().decode(resultBytes));
    } catch (err: any) {
      console.warn(`[Fabric Gateway] GetOrganization failed for ${orgId}:`, err.message);
      return null;
    }
  }
}
