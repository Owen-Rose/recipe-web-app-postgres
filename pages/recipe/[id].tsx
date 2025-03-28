import { GetServerSideProps } from "next";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ParsedUrlQuery } from "querystring";
import { Recipe } from "@/types/Recipe";
import RecipeDetailsPageMobile from "../../components/RecipeDetailsPageMobile";
import RecipeDetailsPageDesktop from "../../components/RecipeDetailsPageDesktop";
import { getRecipeRepository } from "@/repositories";

const RecipeDetailsPage: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return isMobile ? (
    <RecipeDetailsPageMobile recipe={recipe} />
  ) : (
    <RecipeDetailsPageDesktop recipe={recipe} />
  );
};

interface Params extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Safely extract and validate id parameter
  const { id } = context.params || {};

  // Early return if no valid ID is present
  if (!id || Array.isArray(id) || id === 'undefined' || id === 'null') {
    console.error(`Invalid recipe ID requested: ${id}`);
    return {
      notFound: true,
    };
  }

  // Validate that ID is numeric
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    console.error(`Recipe ID is not a valid number: ${id}`);
    return {
      notFound: true,
    };
  }

  try {
    // Get recipe from database using the repository
    const recipeRepo = getRecipeRepository();
    const recipe = await recipeRepo.findById(numericId);

    if (!recipe) {
      console.log(`Recipe not found with ID: ${id}`);
      return {
        notFound: true,
      };
    }

    return {
      props: {
        recipe: JSON.parse(JSON.stringify(recipe)), // Serialize dates properly
      },
    };
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return {
      notFound: true,
    };
  }
};

export default RecipeDetailsPage;