import * as grpc from "@grpc/grpc-js";
import { connect, signers } from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const cryptoRoot = path.resolve(__dirname, "../../../../blockchain/network/crypto-config");
  const tlsCertPath = path.join(cryptoRoot, "peerOrganizations/banka.threattrust.local/peers/peer0.banka.threattrust.local/tls/ca.crt");
  const signCertPath = path.join(cryptoRoot, "peerOrganizations/banka.threattrust.local/users/Admin@banka.threattrust.local/msp/signcerts/Admin@banka.threattrust.local-cert.pem");
  const keyPath = path.join(cryptoRoot, "peerOrganizations/banka.threattrust.local/users/Admin@banka.threattrust.local/msp/keystore/priv_sk");

  console.log("TLS Cert exists:", fs.existsSync(tlsCertPath));
  console.log("Sign Cert exists:", fs.existsSync(signCertPath));
  console.log("Key exists:", fs.existsSync(keyPath));

  const tlsCert = fs.readFileSync(tlsCertPath);
  const signCert = fs.readFileSync(signCertPath);
  const keyPem = fs.readFileSync(keyPath);

  const sslCreds = grpc.credentials.createSsl(tlsCert);
  const client = new grpc.Client("localhost:7051", sslCreds, {
    "grpc.ssl_target_name_override": "peer0.banka.threattrust.local",
  });

  const privateKey = crypto.createPrivateKey(keyPem);
  const signer = signers.newPrivateKeySigner(privateKey);

  const gateway = connect({
    client,
    identity: {
      mspId: "BankAMSP",
      credentials: signCert,
    },
    signer,
  });

  try {
    const network = gateway.getNetwork("cti-channel");
    const contract = network.getContract("threattrust_cc");

    console.log("Evaluating GetOrganization for org-banka...");
    const resultBytes = await contract.evaluateTransaction("GetOrganization", "org-banka");
    const result = new TextDecoder().decode(resultBytes);
    console.log("SUCCESS! Result:", result);

    console.log("Testing newProposal submission flow...");
    const proposal = contract.newProposal("CheckDuplicate", {
      arguments: ["ip", "185.10.20.99"],
    });
    const txId = proposal.getTransactionId();
    console.log("Generated Proposal TxId:", txId);

    const endorsement = await proposal.endorse();
    const commit = await endorsement.submit();
    const status = await commit.getStatus();
    console.log("Commit Status:", status.successful, "Block:", status.blockNumber.toString(), "TxID:", status.transactionId);
  } finally {
    gateway.close();
    client.close();
  }
}

main().catch((err) => {
  console.error("Gateway test failed:", err);
});
