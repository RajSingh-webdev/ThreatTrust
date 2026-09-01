import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AuthenticatedRequest, JwtPayload } from "../types";

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication required",
      message: "Authorization header must be provided in Bearer <token> format.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: "Invalid token",
      message: err.name === "TokenExpiredError" ? "Authentication token has expired." : "Failed to authenticate token.",
    });
  }
}
