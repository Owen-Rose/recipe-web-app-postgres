// repositories/invitationRepository.ts
import { Invitation, InvitationStatus } from "@/types/Invitation";
import { query, querySingle, InvitationRepository } from "../lib/postgres";

export class PostgresInvitationRepository implements InvitationRepository {
    async findAll(): Promise<Invitation[]> {
        return await query<Invitation>(
            `SELECT id, email, role, token, status, expires_at, invited_by, created_at, completed_at
       FROM invitations
       ORDER BY created_at DESC`
        );
    }

    async findById(id: string | number): Promise<Invitation | null> {
        return await querySingle<Invitation>(
            `SELECT id, email, role, token, status, expires_at, invited_by, created_at, completed_at
       FROM invitations
       WHERE id = $1`,
            [id]
        );
    }

    async findByToken(token: string): Promise<Invitation | null> {
        return await querySingle<Invitation>(
            `SELECT id, email, role, token, status, expires_at, invited_by, created_at, completed_at
       FROM invitations
       WHERE token = $1`,
            [token]
        );
    }

    async findPendingByEmail(email: string): Promise<Invitation | null> {
        return await querySingle<Invitation>(
            `SELECT id, email, role, token, status, expires_at, invited_by, created_at, completed_at
       FROM invitations
       WHERE email = $1 
       AND status = 'PENDING'
       AND expires_at > NOW()`,
            [email.toLowerCase()]
        );
    }

    async create(invitation: Omit<Invitation, "id">): Promise<Invitation> {
        const result = await query<Invitation>(
            `INSERT INTO invitations (email, role, token, status, expires_at, invited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role, token, status, expires_at, invited_by, created_at, completed_at`,
            [
                invitation.email.toLowerCase(),
                invitation.role,
                invitation.token,
                invitation.status,
                invitation.expiresAt,
                invitation.invitedBy,
                new Date()
            ]
        );

        return result[0];
    }

    async update(id: string | number, invitation: Partial<Invitation>): Promise<Invitation | null> {
        // Start building the query
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Add fields that are present in the update
        if (invitation.email !== undefined) {
            setValues.push(`email = $${paramIndex++}`);
            queryParams.push(invitation.email.toLowerCase());
        }

        if (invitation.role !== undefined) {
            setValues.push(`role = $${paramIndex++}`);
            queryParams.push(invitation.role);
        }

        if (invitation.status !== undefined) {
            setValues.push(`status = $${paramIndex++}`);
            queryParams.push(invitation.status);
        }

        if (invitation.expiresAt !== undefined) {
            setValues.push(`expires_at = $${paramIndex++}`);
            queryParams.push(invitation.expiresAt);
        }

        if (invitation.completedAt !== undefined) {
            setValues.push(`completed_at = $${paramIndex++}`);
            queryParams.push(invitation.completedAt);
        }

        // Add the id as the last parameter
        queryParams.push(id);

        // If nothing to update, return the existing invitation
        if (setValues.length === 0) {
            return this.findById(id);
        }

        // Execute the update query
        const result = await query<Invitation>(
            `UPDATE invitations
       SET ${setValues.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, role, token, status, expires_at, invited_by, created_at, completed_at`,
            queryParams
        );

        return result.length > 0 ? result[0] : null;
    }

    async updateStatus(token: string, status: string, completedAt?: Date): Promise<boolean> {
        const queryParams = [status, token];
        let query = `UPDATE invitations SET status = $1`;

        if (completedAt) {
            query += `, completed_at = $3`;
            queryParams.push(completedAt);
        }

        query += ` WHERE token = $2 RETURNING id`;

        const result = await query(query, queryParams);
        return result.length > 0;
    }

    async delete(id: string | number): Promise<boolean> {
        const result = await query(
            `DELETE FROM invitations
       WHERE id = $1
       RETURNING id`,
            [id]
        );

        return result.length > 0;
    }

    async listInvitations(
        status?: InvitationStatus,
        page: number = 1,
        limit: number = 10
    ): Promise<{ invitations: Invitation[]; total: number }> {
        const offset = (page - 1) * limit;
        let whereClause = '';
        const params: any[] = [limit, offset];

        if (status) {
            whereClause = 'WHERE status = $3';
            params.push(status);
        }

        // Get invitations with pagination
        const invitations = await query<Invitation>(
            `SELECT id, email, role, token, status, expires_at, invited_by, created_at, completed_at
       FROM invitations
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
            params
        );

        // Get total count for pagination
        const countParams = status ? [status] : [];
        const countQuery = `SELECT COUNT(*) FROM invitations ${status ? 'WHERE status = $1' : ''}`;
        const countResult = await query<{ count: string }>(countQuery, countParams);

        return {
            invitations,
            total: parseInt(countResult[0].count)
        };
    }
}