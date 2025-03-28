import { NextApiResponse } from "next";
import { getArchiveRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid archive ID" });
  }

  switch (method) {
    case "GET":
      return withApiAuth(getArchive, Permission.VIEW_RECIPES)(req, res);
    case "PUT":
      return withApiAuth(updateArchive, Permission.EDIT_RECIPES)(req, res);
    case "DELETE":
      return withApiAuth(deleteArchive, Permission.DELETE_RECIPES)(req, res);
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

async function getArchive(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const archiveRepo = getArchiveRepository();

  try {
    // Check if detailed view is requested
    const { withRecipes } = req.query;

    let archive;
    if (withRecipes === 'true') {
      archive = await archiveRepo.findWithRecipes(Number(id));
    } else {
      archive = await archiveRepo.findById(id);
    }

    if (!archive) {
      return res.status(404).json({ error: "Archive not found" });
    }

    res.status(200).json(archive);
  } catch (error) {
    console.error("Failed to fetch archive:", error);
    res.status(500).json({ error: "Failed to fetch archive" });
  }
}

async function updateArchive(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const { name, description } = req.body;
  const archiveRepo = getArchiveRepository();

  try {
    const updatedArchive = await archiveRepo.update(id, {
      name,
      description,
      lastModifiedDate: new Date(),
    });

    if (!updatedArchive) {
      return res.status(404).json({ error: "Archive not found" });
    }

    res.status(200).json({ message: "Archive updated successfully", archive: updatedArchive });
  } catch (error) {
    console.error("Failed to update archive:", error);
    res.status(500).json({ error: "Failed to update archive" });
  }
}

async function deleteArchive(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const archiveRepo = getArchiveRepository();

  try {
    const success = await archiveRepo.delete(id);

    if (!success) {
      return res.status(404).json({ error: "Archive not found" });
    }

    res.status(200).json({ message: "Archive deleted successfully" });
  } catch (error) {
    console.error("Failed to delete archive:", error);
    res.status(500).json({ error: "Failed to delete archive" });
  }
}

export default handler;