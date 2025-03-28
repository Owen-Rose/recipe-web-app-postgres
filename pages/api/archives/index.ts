import { NextApiResponse } from "next";
import { getArchiveRepository } from "../../../repositories";
import {
  withApiAuth,
  ExtendedNextApiRequest,
} from "../../../lib/auth-middleware";
import { Permission } from "../../../types/Permission";

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const archiveRepo = getArchiveRepository();

  switch (method) {
    case "GET":
      return withApiAuth(getArchives, Permission.VIEW_RECIPES)(req, res);
    case "POST":
      return withApiAuth(createArchive, Permission.EDIT_RECIPES)(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

async function getArchives(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    const archives = await getArchiveRepository().findAll();
    res.status(200).json(archives);
  } catch (error) {
    console.error("Failed to fetch archives:", error);
    res.status(500).json({ error: "Failed to fetch archives" });
  }
}

async function createArchive(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ error: "Archive name is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "User ID not found" });
    }

    const archiveRepo = getArchiveRepository();

    const newArchive = await archiveRepo.create({
      name,
      description,
      createdDate: new Date(),
      lastModifiedDate: new Date(),
      createdBy: Number(userId),
    });

    res.status(201).json(newArchive);
  } catch (error) {
    console.error("Failed to create archive:", error);
    res.status(500).json({ error: "Failed to create archive" });
  }
}

export default handler;