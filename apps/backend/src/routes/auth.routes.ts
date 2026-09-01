import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../db";
import { config } from "../config/env";
import { authenticate } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { AuthenticatedRequest, JwtPayload } from "../types";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials against seeded database users and issues signed JWT.
 */
router.post(
  "/login",
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          organization: true,
        },
      });

      if (!user) {
        res.status(401).json({
          error: "Invalid credentials",
          message: "User not found with the provided username.",
        });
        return;
      }

      if (user.status !== "active") {
        res.status(403).json({
          error: "Account inactive",
          message: "Your user account has been suspended.",
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          error: "Invalid credentials",
          message: "Incorrect password provided.",
        });
        return;
      }

      const payload: JwtPayload = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        username: user.username,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as any,
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          orgType: user.organization.orgType,
          reputationScore: user.organization.reputationScore,
          fabricMspId: user.organization.fabricMspId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Returns currently authenticated user and organization metadata.
 */
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          organization: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization: user.organization,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
