import { NextApiRequest, NextApiResponse } from "next";
import { query, transaction } from "../../../lib/postgres";
import { withApiAuth } from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { recipeIds, archiveId } = req.body;

  if (
    !recipeIds ||
    !Array.isArray(recipeIds) ||
    recipeIds.length === 0 ||
    !archiveId
  ) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    // Process restoration in a transaction
    await transaction(async (client) => {
      // For each recipe ID, restore from archived_recipes
      for (const recipeId of recipeIds) {
        // Fetch the archived recipe data
        const archivedRecipes = await client.query(
          `SELECT recipe_data FROM archived_recipes 
           WHERE archive_id = $1 AND original_recipe_id = $2`,
          [archiveId, recipeId]
        );

        if (archivedRecipes.rowCount === 0) {
          throw new Error(`Recipe ${recipeId} not found in archive ${archiveId}`);
        }

        // Get the recipe data from JSON
        const recipeData = archivedRecipes.rows[0].recipe_data;

        // Create a new recipe record
        const result = await client.query(
          `INSERT INTO recipes (
             name, created_date, version, station, batch_number, yield, 
             portion_size, portions_per_recipe, description, food_cost, 
             created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            recipeData.name,
            recipeData.created_date,
            recipeData.version,
            recipeData.station,
            recipeData.batch_number,
            recipeData.yield,
            recipeData.portion_size,
            recipeData.portions_per_recipe,
            recipeData.description,
            recipeData.food_cost,
            new Date(),
            new Date()
          ]
        );

        const newRecipeId = result.rows[0].id;

        // Restore ingredients if present
        if (recipeData.ingredients && recipeData.ingredients.length > 0) {
          for (const ingredient of recipeData.ingredients) {
            await client.query(
              `INSERT INTO ingredients (recipe_id, vendor, product_name, quantity, unit)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                newRecipeId,
                ingredient.vendor || null,
                ingredient.product_name,
                ingredient.quantity,
                ingredient.unit
              ]
            );
          }
        }

        // Restore equipment if present
        if (recipeData.equipment && recipeData.equipment.length > 0) {
          for (const equipmentName of recipeData.equipment) {
            await client.query(
              `INSERT INTO equipment (recipe_id, name)
               VALUES ($1, $2)`,
              [newRecipeId, equipmentName]
            );
          }
        }

        // Restore procedures if present
        if (recipeData.procedure && recipeData.procedure.length > 0) {
          for (let i = 0; i < recipeData.procedure.length; i++) {
            await client.query(
              `INSERT INTO procedures (recipe_id, step_number, description)
               VALUES ($1, $2, $3)`,
              [newRecipeId, i + 1, recipeData.procedure[i]]
            );
          }
        }

        // Remove the archived recipe
        await client.query(
          `DELETE FROM archived_recipes 
           WHERE archive_id = $1 AND original_recipe_id = $2`,
          [archiveId, recipeId]
        );
      }
    });

    res.status(200).json({
      message: `Successfully restored ${recipeIds.length} recipes`,
    });
  } catch (error) {
    console.error("Error restoring recipes:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export default withApiAuth(handler, Permission.EDIT_RECIPES);