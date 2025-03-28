// utils/invitationUtils.ts
import crypto from 'crypto';
import { Invitation, InvitationStatus } from '@/types/Invitation';
import { UserRole } from '@/types/Roles';

// Updated to work with PostgreSQL-based types
export class InvitationUtils {
    private static EXPIRATION_DAYS = 7;

    /**
     * Generates a secure random token for invitations
     */
    static generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Validates if an invitation is still valid
     */
    static isValid(invitation: Invitation): boolean {
        return (
            invitation.status === InvitationStatus.PENDING &&
            new Date(invitation.expiresAt) > new Date()
        );
    }

    /**
     * Generates the invitation magic link URL
     */
    static generateMagicLink(token: string, baseUrl: string): string {
        return `${baseUrl}/register?token=${token}`;
    }
}

export const INVITATION_ERRORS = {
    EXPIRED: "Invitation has expired",
    INVALID: "Invalid invitation token",
    ALREADY_COMPLETED: "Invitation has already been used",
    EMAIL_IN_USE: "Email is already registered",
    NOT_FOUND: "Invitation not found",
    ALREADY_INVITED: "Active invitation already exists"
} as const;