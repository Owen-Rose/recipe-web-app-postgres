import { NextApiResponse } from "next";
import { getInvitationRepository } from "../../../repositories";
import {
    withApiAuth,
    ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";
import { InvitationStatus } from "../../../types/Invitation";
import { UserRole } from "../../../types/Roles";
import { InvitationUtils } from "../../../utils/invitationUtils";

async function baseHandler(req: ExtendedNextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        const invitationRepo = getInvitationRepository();

        switch (method) {
            case "GET":
                if (!req.user?.hasPermission(Permission.VIEW_USERS)) {
                    return res.status(403).json({ error: "Not authorized" });
                }

                const { status, page = "1", limit = "10" } = req.query;
                const result = await invitationRepo.listInvitations(
                    status as InvitationStatus | undefined,
                    parseInt(page as string),
                    parseInt(limit as string)
                );

                return res.status(200).json({
                    invitations: result.invitations,
                    total: result.total,
                    page: parseInt(page as string),
                    totalPages: Math.ceil(result.total / parseInt(limit as string)),
                });

            case "POST":
                if (!req.user?.hasPermission(Permission.CREATE_USERS)) {
                    return res.status(403).json({ error: "Not authorized" });
                }

                const { email, role } = req.body;

                // Validate required fields
                if (!email || !role) {
                    return res.status(400).json({ error: "Email and role are required" });
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: "Invalid email format" });
                }

                // Validate role is valid
                if (!Object.values(UserRole).includes(role)) {
                    return res.status(400).json({ error: "Invalid role" });
                }

                try {
                    // Check for existing invitation
                    const existingInvitation = await invitationRepo.findPendingByEmail(email);
                    if (existingInvitation) {
                        return res.status(400).json({ error: "An active invitation already exists for this email" });
                    }

                    // Generate token and prepare invitation
                    const token = InvitationUtils.generateToken();
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days expiration

                    const invitation = await invitationRepo.create({
                        email,
                        role,
                        token,
                        status: InvitationStatus.PENDING,
                        expiresAt: expirationDate,
                        invitedBy: Number(req.user.id),
                        createdAt: new Date()
                    });

                    // Generate magic link
                    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                    const magicLink = `${baseUrl}/register?token=${token}`;

                    return res.status(201).json({
                        invitation,
                        magicLink,
                    });
                } catch (error: any) {
                    // Handle specific business logic errors
                    return res.status(400).json({ error: error.message });
                }

            default:
                res.setHeader("Allow", ["GET", "POST"]);
                return res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error('Error in invitation handler:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Wrap the handler with auth middleware
export default withApiAuth(baseHandler, Permission.VIEW_USERS);