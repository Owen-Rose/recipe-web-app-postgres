import { NextApiRequest, NextApiResponse } from "next";
import { getRecipeRepository, getArchiveRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
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
    return res.status(400).json({ message: "Invalid request parameters" });
  }

  try {
    const recipeRepo = getRecipeRepository();
    const archiveRepo = getArchiveRepository();

    // Verify the archive exists
    const archive = await archiveRepo.findById(archiveId);
    if (!archive) {
      return res.status(404).json({ message: "Archive not found" });
    }

    // Convert string IDs to numbers
    const numericRecipeIds = recipeIds.map(id => Number(id));

    // Archive the recipes
    await recipeRepo.batchArchive(numericRecipeIds, Number(archiveId));

    res.status(200).json({ message: "Recipes archived successfully" });
  } catch (error) {
    console.error("Error archiving recipes:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
}

// Only allow users with EDIT_RECIPES permission to access this endpoint
export default withApiAuth(handler, Permission.EDIT_RECIPES);