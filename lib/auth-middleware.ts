// lib/auth-middleware.ts
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { Permission, hasPermission } from "../types/Permission";
import { UserRole } from "../types/Roles";

// Update the interface to include the hasPermission method
export interface ExtendedNextApiRequest extends NextApiRequest {
  user?: {
    role: UserRole;
    id: string;
    hasPermission: (permission: Permission) => boolean;
  };
}

export function withApiAuth(
  handler: NextApiHandler,
  requiredPermission: Permission
) {
  return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session || !session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userRole = session.user.role as UserRole;

      if (!hasPermission(userRole, requiredPermission)) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Add the user object to the request with hasPermission method
      req.user = {
        role: userRole,
        id: session.user.id as string,
        hasPermission: (permission: Permission) => hasPermission(userRole, permission)
      };

      return handler(req, res);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(500).json({ error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}