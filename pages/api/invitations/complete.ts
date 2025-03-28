// pages/api/invitations/complete.ts
import { NextApiRequest, NextApiResponse } from "next";
import { transaction } from "../../../lib/postgres";
import { getInvitationRepository, getUserRepository } from "../../../repositories";
import { InvitationStatus } from "../../../types/Invitation";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { token, firstName, lastName, password } = req.body;

        if (!token || !firstName || !lastName || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const invitationRepo = getInvitationRepository();
        const userRepo = getUserRepository();

        // Execute the registration process in a transaction
        await transaction(async (client) => {
            // 1. Verify the invitation
            const invitation = await invitationRepo.findByToken(token);

            if (!invitation) {
                throw new Error("Invalid invitation token");
            }

            if (invitation.status !== InvitationStatus.PENDING) {
                throw new Error(
                    invitation.status === InvitationStatus.COMPLETED
                        ? "Invitation has already been used"
                        : "Invitation has expired"
                );
            }

            if (invitation.expiresAt < new Date()) {
                await invitationRepo.updateStatus(token, InvitationStatus.EXPIRED);
                throw new Error("Invitation has expired");
            }

            // 2. Check if the email is already registered
            const existingUser = await userRepo.findByEmail(invitation.email);
            if (existingUser) {
                throw new Error("Email is already registered");
            }

            // 3. Create the user account
            const user = await userRepo.create({
                FirstName: firstName,
                LastName: lastName,
                email: invitation.email,
                password: password,
                role: invitation.role,
            });

            // 4. Mark the invitation as completed
            await invitationRepo.updateStatus(token, InvitationStatus.COMPLETED, new Date());

            return {
                user,
                message: "Registration completed successfully"
            };
        }).then(result => {
            // Return success response
            return res.status(201).json(result);
        }).catch(error => {
            // Handle validation errors
            return res.status(400).json({
                error: error.message
            });
        });
    } catch (error) {
        console.error("Failed to complete registration:", error);
        return res.status(500).json({
            error: "Failed to complete registration"
        });
    }
}