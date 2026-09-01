import { Response, NextFunction } from "express";
import { AuthenticatedRequest, UserRole } from "../types";

/**
 * Role-Based Access Control (RBAC) middleware.
 * Enforces that the authenticated user possesses at least one of the permitted roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Action requires one of the following roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}

/**
 * Organization Isolation Guard.
 * Ensures a user cannot perform write or administrative actions on behalf of another organization.
 */
export function requireSameOrg(paramName = "organizationId") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const targetOrgId = req.params[paramName] ?? req.body[paramName];
    if (targetOrgId && targetOrgId !== req.user.organizationId && req.user.role !== "admin") {
      res.status(403).json({
        error: "Forbidden",
        message: "Cross-organization modification prohibited.",
      });
      return;
    }

    next();
  };
}
