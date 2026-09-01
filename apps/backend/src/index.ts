import "dotenv/config";
import { app } from "./app";
import { config } from "./config/env";
import { BlockchainService } from "./services/blockchain.service";

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`\n🛡️  ThreatTrust Backend API v1 running on http://localhost:${PORT}`);
  console.log(`   Health Check:   http://localhost:${PORT}/health`);
  console.log(`   API Endpoint:   http://localhost:${PORT}/api/v1/iocs`);
  console.log(`   Auth Endpoint:  http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   Consortium Orgs: http://localhost:${PORT}/api/v1/orgs`);
  console.log(`   Mode:           ${config.nodeEnv}\n`);

  const fabricLive = await BlockchainService.init();
  if (fabricLive) {
    console.log(`   ⛓️  Hyperledger Fabric 2.5 Gateway: ONLINE (cti-channel / threattrust_cc)\n`);
  } else {
    console.log(`   ℹ️  Hyperledger Fabric 2.5 Gateway: OFFLINE (Operating in fallback mode)\n`);
  }
});

export default server;
