import { NextApiResponse } from "next";
import { getRecipeRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid recipe ID" });
  }

  switch (method) {
    case "GET":
      return withApiAuth(getRecipe, Permission.VIEW_RECIPES)(req, res);
    case "PUT":
      return withApiAuth(updateRecipe, Permission.EDIT_RECIPES)(req, res);
    case "DELETE":
      return withApiAuth(deleteRecipe, Permission.DELETE_RECIPES)(req, res);
    case "POST":
      if (req.body.action === "archive") {
        return withApiAuth(archiveRecipe, Permission.EDIT_RECIPES)(req, res);
      } else if (req.body.action === "unarchive") {
        return withApiAuth(unarchiveRecipe, Permission.EDIT_RECIPES)(req, res);
      }
      res.status(400).json({ error: "Invalid action" });
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

async function getRecipe(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const recipeRepo = getRecipeRepository();

  try {
    const recipe = await recipeRepo.findById(id as string);

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.status(200).json(recipe);
  } catch (error) {
    console.error("Failed to fetch recipe:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
}

async function updateRecipe(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const recipeRepo = getRecipeRepository();

  try {
    const updatedRecipe = req.body;

    // Validate required fields
    if (updatedRecipe.name !== undefined && !updatedRecipe.name) {
      return res.status(400).json({ error: "Recipe name cannot be empty" });
    }

    const result = await recipeRepo.update(id as string, updatedRecipe);

    if (!result) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe updated successfully", recipe: result });
  } catch (error) {
    console.error("Failed to update recipe:", error);
    res.status(500).json({ error: "Failed to update recipe" });
  }
}

async function deleteRecipe(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const recipeRepo = getRecipeRepository();

  try {
    const success = await recipeRepo.delete(id as string);

    if (!success) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
}

async function archiveRecipe(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { archiveId } = req.body;
  const recipeRepo = getRecipeRepository();

  try {
    if (!archiveId) {
      return res.status(400).json({ error: "Archive ID is required" });
    }

    // Update recipe to set archive ID and date
    const result = await recipeRepo.update(id as string, {
      archiveId: archiveId,
      archiveDate: new Date(),
    });

    if (!result) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe archived successfully" });
  } catch (error) {
    console.error("Failed to archive recipe:", error);
    res.status(500).json({ error: "Failed to archive recipe" });
  }
}

async function unarchiveRecipe(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const recipeRepo = getRecipeRepository();

  try {
    // Update recipe to remove archive ID and date
    const result = await recipeRepo.update(id as string, {
      archiveId: null,
      archiveDate: null,
    });

    if (!result) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.status(200).json({ message: "Recipe unarchived successfully" });
  } catch (error) {
    console.error("Failed to unarchive recipe:", error);
    res.status(500).json({ error: "Failed to unarchive recipe" });
  }
}

export default handler;