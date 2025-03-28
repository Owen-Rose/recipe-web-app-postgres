// types/Recipe.ts
import { Ingredient } from "./Ingredient";

export interface Recipe {
  id: number;
  name: string;
  createdDate: string;
  version: string;
  station: string;
  batchNumber: number;
  equipment: string[];
  ingredients: Ingredient[];
  yield: string;
  portionSize: string;
  portionsPerRecipe: string;
  procedure: string[];
  description?: string;
  foodCost?: number;
  archiveId?: number | null;
  archiveDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}