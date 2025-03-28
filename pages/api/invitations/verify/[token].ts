// pages/api/invitations/verify/[token].ts
import { NextApiRequest, NextApiResponse } from "next";
import { getInvitationRepository } from "../../../../repositories";
import { InvitationStatus } from "../../../../types/Invitation";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Invalid token" });
        }

        const invitationRepo = getInvitationRepository();
        const invitation = await invitationRepo.findByToken(token);

        if (!invitation) {
            return res.status(400).json({ error: "Invalid invitation token" });
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            return res.status(400).json({
                error: invitation.status === InvitationStatus.COMPLETED
                    ? "Invitation has already been used"
                    : "Invitation has expired"
            });
        }

        if (invitation.expiresAt < new Date()) {
            // Update the invitation status to expired
            await invitationRepo.updateStatus(token, InvitationStatus.EXPIRED);
            return res.status(400).json({ error: "Invitation has expired" });
        }

        return res.status(200).json({
            valid: true,
            invitation
        });
    } catch (error) {
        console.error("Failed to verify invitation:", error);
        return res.status(500).json({ error: "Failed to verify invitation" });
    }
}