// types/Archive.ts
import { Recipe } from "./Recipe";

export interface Archive {
  id: number;
  name: string;
  description?: string;
  createdDate: Date;
  lastModifiedDate: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  recipes?: ArchivedRecipe[];
}

export interface ArchivedRecipe extends Omit<Recipe, 'id'> {
  archivedDate: Date;
  originalId: number;
}