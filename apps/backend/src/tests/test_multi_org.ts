import * as grpc from "@grpc/grpc-js";
import { connect, signers, Gateway } from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const cryptoRoot = path.resolve(__dirname, "../../../../blockchain/network/crypto-config");

function getOrgGateway(orgIdOrMsp: string): { gateway: Gateway; client: grpc.Client } {
  let mspId = "BankAMSP";
  let domain = "banka.threattrust.local";
  let port = 7051;

  if (orgIdOrMsp === "org-bankb" || orgIdOrMsp === "BankBMSP") {
    mspId = "BankBMSP";
    domain = "bankb.threattrust.local";
    port = 8051;
  } else if (orgIdOrMsp === "org-certc" || orgIdOrMsp === "CERTCMSP") {
    mspId = "CERTCMSP";
    domain = "certc.threattrust.local";
    port = 9051;
  }

  const tlsCertPath = path.join(cryptoRoot, `peerOrganizations/${domain}/peers/peer0.${domain}/tls/ca.crt`);
  const signCertPath = path.join(cryptoRoot, `peerOrganizations/${domain}/users/Admin@${domain}/msp/signcerts/Admin@${domain}-cert.pem`);
  const keyPath = path.join(cryptoRoot, `peerOrganizations/${domain}/users/Admin@${domain}/msp/keystore/priv_sk`);

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

  return { gateway, client };
}

async function test() {
  for (const org of ["org-banka", "org-bankb", "org-certc"]) {
    const { gateway, client } = getOrgGateway(org);
    try {
      const network = gateway.getNetwork("cti-channel");
      const contract = network.getContract("threattrust_cc");
      const resultBytes = await contract.evaluateTransaction("GetOrganization", org);
      console.log(`Org ${org} query SUCCESS:`, new TextDecoder().decode(resultBytes));
    } finally {
      gateway.close();
      client.close();
    }
  }
}

test().catch(console.error);
