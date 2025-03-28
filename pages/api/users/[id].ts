import { NextApiResponse } from "next";
import { getUserRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";
import { UserRole } from "../../../types/Roles";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  switch (req.method) {
    case "GET":
      return withApiAuth(getUser, Permission.VIEW_USERS)(req, res);
    case "PUT":
      return withApiAuth(updateUser, Permission.EDIT_USERS)(req, res);
    case "DELETE":
      return withApiAuth(deleteUser, Permission.DELETE_USERS)(req, res);
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getUser(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    const userRepo = getUserRepository();
    const user = await userRepo.findById(id as string);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

async function updateUser(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { email, password, FirstName, LastName, role } = req.body;
  const currentUserRole = req.user?.role;

  if (!currentUserRole) {
    return res.status(401).json({ error: "User role not found" });
  }

  try {
    const userRepo = getUserRepository();
    const existingUser = await userRepo.findById(id as string);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current user is allowed to edit the user
    if (!canEditUser(currentUserRole, existingUser.role as UserRole)) {
      return res.status(403).json({
        error: `You don't have permission to edit ${existingUser.role} users`,
      });
    }

    // Check if the current user is allowed to assign the new role
    if (role && !isAllowedToAssignRole(currentUserRole, role as UserRole)) {
      return res
        .status(403)
        .json({ error: "You don't have permission to assign this role" });
    }

    // Update the user
    const updatedUser = await userRepo.update(id as string, {
      email,
      password,
      FirstName,
      LastName,
      role: role as UserRole,
    });

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
}

async function deleteUser(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const currentUserRole = req.user?.role;

  if (!currentUserRole) {
    return res.status(401).json({ error: "User role not found" });
  }

  try {
    const userRepo = getUserRepository();
    const userToDelete = await userRepo.findById(id as string);

    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current user is allowed to delete the user
    if (!canEditUser(currentUserRole, userToDelete.role as UserRole)) {
      return res.status(403).json({
        error: `You don't have permission to delete ${userToDelete.role} users`,
      });
    }

    const success = await userRepo.delete(id as string);

    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}

function canEditUser(currentRole: UserRole, targetRole: UserRole): boolean {
  if (currentRole === UserRole.ADMIN) return true;
  if (currentRole === UserRole.CHEF) return targetRole !== UserRole.ADMIN;
  if (currentRole === UserRole.PASTRY_CHEF)
    return targetRole !== UserRole.ADMIN && targetRole !== UserRole.CHEF;
  if (currentRole === UserRole.MANAGER) return targetRole === UserRole.STAFF;
  return false;
}

function isAllowedToAssignRole(
  currentRole: UserRole,
  targetRole: UserRole
): boolean {
  switch (currentRole) {
    case UserRole.ADMIN:
      return true;
    case UserRole.CHEF:
      return (
        targetRole === UserRole.CHEF ||
        targetRole === UserRole.MANAGER ||
        targetRole === UserRole.STAFF
      );
    case UserRole.MANAGER:
      return targetRole === UserRole.STAFF;
    default:
      return false;
  }
}

export default handler;