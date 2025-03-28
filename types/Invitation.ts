// types/Invitation.ts
import { UserRole } from "./Roles";

export enum InvitationStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    EXPIRED = "EXPIRED"
}

export interface Invitation {
    id: number;
    email: string;
    role: UserRole;
    token: string;
    status: InvitationStatus;
    expiresAt: Date;
    invitedBy: number;
    createdAt: Date;
    completedAt?: Date;
}

export interface CreateInvitationDto {
    email: string;
    role: UserRole;
    invitedBy: number;
}

export interface VerifyInvitationResult {
    valid: boolean;
    invitation?: Invitation;
    error?: string;
}

export interface CompleteInvitationDto {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
}