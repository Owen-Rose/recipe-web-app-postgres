// repositories/archiveRepository.ts
import { Archive } from "@/types/Archive";
import { query, querySingle, ArchiveRepository } from "../lib/postgres";

export class PostgresArchiveRepository implements ArchiveRepository {
    async findAll(): Promise<Archive[]> {
        return await query<Archive>(
            `SELECT id, name, description, created_date, last_modified_date, created_by, created_at, updated_at
       FROM archives
       ORDER BY name`
        );
    }

    async findById(id: string | number): Promise<Archive | null> {
        return await querySingle<Archive>(
            `SELECT id, name, description, created_date, last_modified_date, created_by, created_at, updated_at
       FROM archives
       WHERE id = $1`,
            [id]
        );
    }

    async findWithRecipes(id: number): Promise<any> {
        // Get the archive
        const archive = await this.findById(id);

        if (!archive) return null;

        // Get archived recipes for this archive
        const archivedRecipes = await query(
            `SELECT id, archive_id, original_recipe_id, archived_date, recipe_data
       FROM archived_recipes
       WHERE archive_id = $1
       ORDER BY archived_date DESC`,
            [id]
        );

        // Return combined result
        return {
            ...archive,
            recipes: archivedRecipes.map(recipe => ({
                archivedDate: recipe.archived_date,
                originalId: recipe.original_recipe_id,
                ...JSON.parse(recipe.recipe_data)
            }))
        };
    }

    async create(archive: Omit<Archive, "id">): Promise<Archive> {
        const result = await query<Archive>(
            `INSERT INTO archives (name, description, created_date, last_modified_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, created_date, last_modified_date, created_by, created_at, updated_at`,
            [
                archive.name,
                archive.description || null,
                archive.createdDate,
                archive.lastModifiedDate,
                archive.createdBy,
                new Date(),
                new Date()
            ]
        );

        return result[0];
    }

    async update(id: string | number, archive: Partial<Archive>): Promise<Archive | null> {
        // Start building the query
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        // Add fields that are present in the update
        if (archive.name !== undefined) {
            setValues.push(`name = $${paramIndex++}`);
            queryParams.push(archive.name);
        }

        if (archive.description !== undefined) {
            setValues.push(`description = $${paramIndex++}`);
            queryParams.push(archive.description);
        }

        if (archive.lastModifiedDate !== undefined) {
            setValues.push(`last_modified_date = $${paramIndex++}`);
            queryParams.push(archive.lastModifiedDate);
        }

        // Add updated timestamp
        setValues.push(`updated_at = $${paramIndex++}`);
        queryParams.push(new Date());

        // Add the id as the last parameter
        queryParams.push(id);

        // If nothing to update, return the existing archive
        if (setValues.length === 1) { // Only updated_at was added
            return this.findById(id);
        }

        // Execute the update query
        const result = await query<Archive>(
            `UPDATE archives
       SET ${setValues.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, created_date, last_modified_date, created_by, created_at, updated_at`,
            queryParams
        );

        return result.length > 0 ? result[0] : null;
    }

    async delete(id: string | number): Promise<boolean> {
        // Note: This will cascade delete all archived recipes in this archive due to foreign key constraints
        const result = await query(
            `DELETE FROM archives
       WHERE id = $1
       RETURNING id`,
            [id]
        );

        return result.length > 0;
    }
}