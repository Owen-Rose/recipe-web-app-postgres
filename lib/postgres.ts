// lib/postgres.ts
import { Pool, PoolClient } from 'pg';
import { Recipe } from '@/types/Recipe';
import { User } from '@/types/User';
import { Archive } from '@/types/Archive';
import { Invitation } from '@/types/Invitation';

// Check if we're in development mode to enable console logs
const isDev = process.env.NODE_ENV !== 'production';

// Connection pool configuration
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'recipe_management',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
    ssl: process.env.POSTGRES_SSL === 'true' ? {
        rejectUnauthorized: false
    } : undefined
});

// Log when the pool creates a new client (helpful for debugging connection issues)
pool.on('connect', () => {
    if (isDev) console.log('PostgreSQL pool connected a new client');
});

// Log errors when they occur in the pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

// Generic query function that handles error management
export async function query<T>(
    text: string,
    params: any[] = []
): Promise<T[]> {
    const start = Date.now();
    try {
        // Validate parameters to catch common errors early
        if (params.includes(undefined)) {
            console.warn("Warning: undefined value in query parameters", { text, params });
            // Replace undefined with null for PostgreSQL compatibility
            params = params.map(p => p === undefined ? null : p);
        }

        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        if (isDev) {
            console.log('Executed query', { text, params, duration, rows: res.rowCount });
        }

        return res.rows as T[];
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}


// Single-result query function for when you expect only one row
export async function querySingle<T>(
    text: string,
    params: any[] = []
): Promise<T | null> {
    // Validate parameters to catch common errors early
    if (params.includes(undefined)) {
        console.warn("Warning: undefined value in querySingle parameters", { text, params });
        // Replace undefined with null for PostgreSQL compatibility
        params = params.map(p => p === undefined ? null : p);
    }

    const rows = await query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
}

// Transaction support
export async function transaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// Repository interfaces - these provide type-safe access to the database tables
export interface DbRepository<T> {
    findAll(): Promise<T[]>;
    findById(id: string | number): Promise<T | null>;
    create(item: Omit<T, 'id'>): Promise<T>;
    update(id: string | number, item: Partial<T>): Promise<T | null>;
    delete(id: string | number): Promise<boolean>;
}

// Helper function to convert snake_case column names to camelCase for JS
export function snakeToCamel<T>(row: any): T {
    const result: any = {};
    for (const key in row) {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = row[key];
    }
    return result as T;
}

// Export connection pool for direct access when needed
export { pool };

// Export repository interfaces for any code that needs database operations
export interface RecipeRepository extends DbRepository<Recipe> {
    // Additional recipe-specific methods
    findByStation(station: string): Promise<Recipe[]>;
    batchArchive(recipeIds: number[], archiveId: number): Promise<void>;
    findIngredients(recipeId: number): Promise<any[]>;
    findEquipment(recipeId: number): Promise<any[]>;
    findProcedures(recipeId: number): Promise<any[]>;
}

export interface UserRepository extends DbRepository<User> {
    // Additional user-specific methods
    findByEmail(email: string): Promise<User | null>;
    changePassword(id: number, newPassword: string): Promise<boolean>;
}

export interface ArchiveRepository extends DbRepository<Archive> {
    // Additional archive-specific methods
    findWithRecipes(id: number): Promise<any>;
}

export interface InvitationRepository extends DbRepository<Invitation> {
    // Additional invitation-specific methods
    findByToken(token: string): Promise<Invitation | null>;
    findPendingByEmail(email: string): Promise<Invitation | null>;
    updateStatus(token: string, status: string, completedAt?: Date): Promise<boolean>;
}

// Function to end the pool when the application shuts down
export async function closePool() {
    await pool.end();
}

// Export the connection function for components that need the specific repositories
export async function getRepositories() {
    return {
        recipes: {} as RecipeRepository,
        users: {} as UserRepository,
        archives: {} as ArchiveRepository,
        invitations: {} as InvitationRepository,
    };
}