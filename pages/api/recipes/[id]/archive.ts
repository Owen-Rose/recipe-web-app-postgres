import { NextApiRequest, NextApiResponse } from "next";
import { getRecipeRepository, getArchiveRepository } from "../../../../repositories";
import { withApiAuth } from "../../../../lib/auth-middleware";
import { Permission } from "../../../../types/Permission";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;
  const { archiveId } = req.body;

  if (!id || Array.isArray(id) || !archiveId) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const recipeRepo = getRecipeRepository();
    const archiveRepo = getArchiveRepository();

    // Verify the recipe exists
    const recipe = await recipeRepo.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Verify the archive exists
    const archive = await archiveRepo.findById(archiveId);
    if (!archive) {
      return res.status(404).json({ message: "Archive not found" });
    }

    // Batch archive a single recipe (this creates the archived_recipes entry and deletes the original)
    await recipeRepo.batchArchive([Number(id)], Number(archiveId));

    res.status(200).json({ message: "Recipe archived successfully" });
  } catch (error) {
    console.error("Error archiving recipe:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
}

export default withApiAuth(handler, Permission.EDIT_RECIPES);