// types/Ingredient.ts
export interface Ingredient {
  id?: number;
  recipe_id?: number;
  vendor?: string;
  productName: string;
  quantity: number;
  unit: string;
}