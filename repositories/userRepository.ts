// repositories/userRepository.ts
import { User } from "@/types/User";
import { UserRole } from "@/types/Roles";
import { query, querySingle, UserRepository, snakeToCamel } from "../lib/postgres";
import { hash, compare } from "bcryptjs";

export class PostgresUserRepository implements UserRepository {
    async findAll(): Promise<User[]> {
        return await query<User>(
            `SELECT id, first_name, last_name, email, role, created_at, updated_at 
       FROM users 
       ORDER BY first_name, last_name`
        );
    }

    async findById(id: string | number): Promise<User | null> {
        return await querySingle<User>(
            `SELECT id, first_name, last_name, email, role, created_at, updated_at 
       FROM users 
       WHERE id = $1`,
            [id]
        );
    }

    async findByEmail(email: string): Promise<User | null> {
        return await querySingle<User>(
            `SELECT id, first_name, last_name, email, password, role, created_at, updated_at 
       FROM users 
       WHERE email = $1`,
            [email]
        );
    }

    async create(user: Omit<User, "id">): Promise<User> {
        // Hash the password before storing
        const hashedPassword = await hash(user.password, 12);

        const result = await query<User>(
            `INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, role, created_at, updated_at`,
            [
                user.FirstName,
                user.LastName,
                user.email.toLowerCase(),
                hashedPassword,
                user.role,
                new Date(),
                new Date()
            ]
        );

        return result[0];
    }

    async update(id: string | number, user: Partial<User>): Promise<User | null> {
        // Start building the query
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Add fields that are present in the update
        if (user.FirstName !== undefined) {
            setValues.push(`first_name = $${paramIndex++}`);
            queryParams.push(user.FirstName);
        }

        if (user.LastName !== undefined) {
            setValues.push(`last_name = $${paramIndex++}`);
            queryParams.push(user.LastName);
        }

        if (user.email !== undefined) {
            setValues.push(`email = $${paramIndex++}`);
            queryParams.push(user.email.toLowerCase());
        }

        if (user.role !== undefined) {
            setValues.push(`role = $${paramIndex++}`);
            queryParams.push(user.role);
        }

        if (user.password !== undefined) {
            const hashedPassword = await hash(user.password, 12);
            setValues.push(`password = $${paramIndex++}`);
            queryParams.push(hashedPassword);
        }

        // Add updated timestamp
        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        // Add the id as the last parameter
        queryParams.push(id);

        // If nothing to update, return the existing user
        if (setValues.length === 1) { // Only updated_at was added
            return this.findById(id);
        }

        // Execute the update query
        const result = await query<User>(
            `UPDATE users
       SET ${setValues.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, first_name, last_name, email, role, created_at, updated_at`,
            queryParams
        );

        return result.length > 0 ? result[0] : null;
    }

    async delete(id: string | number): Promise<boolean> {
        const result = await query(
            `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
            [id]
        );

        return result.length > 0;
    }

    async changePassword(id: number, newPassword: string): Promise<boolean> {
        const hashedPassword = await hash(newPassword, 12);

        const result = await query(
            `UPDATE users
       SET password = $1, updated_at = $2
       WHERE id = $3
       RETURNING id`,
            [hashedPassword, new Date(), id]
        );

        return result.length > 0;
    }

    async verifyPassword(userId: number, password: string): Promise<boolean> {
        const user = await querySingle<{ password: string }>(
            `SELECT password FROM users WHERE id = $1`,
            [userId]
        );

        if (!user) return false;

        return await compare(password, user.password);
    }
}