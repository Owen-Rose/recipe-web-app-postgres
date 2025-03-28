import { NextApiResponse } from "next";
import { getUserRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";
import { UserRole } from "../../../types/Roles";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const userRepo = getUserRepository();

  switch (req.method) {
    case "GET":
      return withApiAuth(getUsers, Permission.VIEW_USERS)(req, res);
    case "POST":
      return withApiAuth(createUser, Permission.CREATE_USERS)(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getUsers(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    const users = await getUserRepository().findAll();
    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

async function createUser(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    const { email, password, FirstName, LastName, role } = req.body;
    const currentUserRole = req.user?.role;

    if (!currentUserRole) {
      return res.status(401).json({ error: "User role not found" });
    }

    if (!email || !password || !FirstName || !LastName || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the current user is allowed to create a user with the given role
    if (!isAllowedToCreateRole(currentUserRole, role as UserRole)) {
      return res.status(403).json({
        error: "You don't have permission to create a user with this role",
      });
    }

    const userRepo = getUserRepository();

    // Check if user already exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create the new user
    const newUser = await userRepo.create({
      email,
      password,
      FirstName,
      LastName,
      role: role as UserRole,
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
}

function isAllowedToCreateRole(
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
      return targetRole === UserRole.MANAGER || targetRole === UserRole.STAFF;
    default:
      return false;
  }
}

export default handler;