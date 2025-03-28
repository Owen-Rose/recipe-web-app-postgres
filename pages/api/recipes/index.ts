import { NextApiRequest, NextApiResponse } from "next";
import { getRecipeRepository } from "../../../repositories";
import corsMiddleware, { runMiddleware } from "../../../lib/cors-middleware";
import { withApiAuth } from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsMiddleware);

  const recipeRepo = getRecipeRepository();

  switch (req.method) {
    case "GET":
      try {
        // Check for filtering options
        const { station } = req.query;

        let recipes;
        if (station && typeof station === 'string') {
          recipes = await recipeRepo.findByStation(station);
        } else {
          recipes = await recipeRepo.findAll();
        }

        res.status(200).json(recipes);
      } catch (error) {
        console.error("Failed to fetch recipes:", error);
        res.status(500).json({ error: "Failed to fetch recipes" });
      }
      break;

    case "POST":
      try {
        const recipe = req.body;

        // Validate required fields
        if (!recipe.name) {
          return res.status(400).json({ error: "Recipe name is required" });
        }

        // Create recipe with all related data
        const newRecipe = await recipeRepo.create(recipe);
        res.status(201).json(newRecipe);
      } catch (error) {
        console.error("Failed to create recipe:", error);
        res.status(500).json({ error: "Failed to create recipe" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withApiAuth(handler, Permission.VIEW_RECIPES);