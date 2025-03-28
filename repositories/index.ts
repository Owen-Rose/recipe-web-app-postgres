// repositories/index.ts
import { PostgresUserRepository } from "./userRepository";
import { PostgresRecipeRepository } from "./recipeRepository";
import { PostgresArchiveRepository } from "./archiveRepository";
import { PostgresInvitationRepository } from "./invitationRepository";
import {
    RecipeRepository,
    UserRepository,
    ArchiveRepository,
    InvitationRepository
} from "@/lib/postgres";

// Repository factory singleton pattern
class RepositoryFactory {
    private static instance: RepositoryFactory;
    private userRepo: UserRepository;
    private recipeRepo: RecipeRepository;
    private archiveRepo: ArchiveRepository;
    private invitationRepo: InvitationRepository;

    private constructor() {
        this.userRepo = new PostgresUserRepository();
        this.recipeRepo = new PostgresRecipeRepository();
        this.archiveRepo = new PostgresArchiveRepository();
        this.invitationRepo = new PostgresInvitationRepository();
    }

    public static getInstance(): RepositoryFactory {
        if (!RepositoryFactory.instance) {
            RepositoryFactory.instance = new RepositoryFactory();
        }
        return RepositoryFactory.instance;
    }

    public getUserRepository(): UserRepository {
        return this.userRepo;
    }

    public getRecipeRepository(): RecipeRepository {
        return this.recipeRepo;
    }

    public getArchiveRepository(): ArchiveRepository {
        return this.archiveRepo;
    }

    public getInvitationRepository(): InvitationRepository {
        return this.invitationRepo;
    }
}

// Export factory methods
export const getRepositories = () => {
    const factory = RepositoryFactory.getInstance();
    return {
        users: factory.getUserRepository(),
        recipes: factory.getRecipeRepository(),
        archives: factory.getArchiveRepository(),
        invitations: factory.getInvitationRepository()
    };
};

// Export individual repository getters
export const getUserRepository = (): UserRepository => {
    return RepositoryFactory.getInstance().getUserRepository();
};

export const getRecipeRepository = (): RecipeRepository => {
    return RepositoryFactory.getInstance().getRecipeRepository();
};

export const getArchiveRepository = (): ArchiveRepository => {
    return RepositoryFactory.getInstance().getArchiveRepository();
};

export const getInvitationRepository = (): InvitationRepository => {
    return RepositoryFactory.getInstance().getInvitationRepository();
};