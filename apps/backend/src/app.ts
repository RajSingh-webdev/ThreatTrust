import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import orgRoutes from "./routes/org.routes";
import iocRoutes from "./routes/ioc.routes";
import auditRoutes from "./routes/audit.routes";
import { errorHandler } from "./middlewares/error.middleware";
import prisma from "./db";

import { BlockchainService } from "./services/blockchain.service";

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const isFabricOnline = BlockchainService.isConnected();
    res.json({
      status: "ok",
      service: "threattrust-backend",
      database: "connected",
      blockchain: isFabricOnline ? "hyperledger_fabric_2.5_online" : "fabric_unavailable_local_mode",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(200).json({
      status: "degraded",
      service: "threattrust-backend",
      database: "in_memory_or_starting",
      message: String(err.message || err),
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes mounted under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/orgs", orgRoutes);
app.use("/api/v1/iocs", iocRoutes);
app.use("/api/v1/audit", auditRoutes);

// Centralized Error Handler
app.use(errorHandler);

export { app };
export default app;
