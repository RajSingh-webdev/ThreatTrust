import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "threattrust_jwt_super_secret_key_2024",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://threattrust:threattrust_secret@localhost:5432/threattrust_db",
  reputation: {
    initialScore: 50,
    verifiedReward: 1,
    falsePenalty: -3,
    restrictionThreshold: 30,
  },
  consensus: {
    endorsementThreshold: 2,
  },
  fabric: {
    channelName: process.env.FABRIC_CHANNEL || "cti-channel",
    chaincodeName: process.env.FABRIC_CHAINCODE || "threattrust_cc",
    mspId: process.env.FABRIC_MSP_ID || "BankAMSP",
    peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || "localhost:7051",
  },
};
