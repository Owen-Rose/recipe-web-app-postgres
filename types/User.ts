// types/User.ts
import { UserRole } from "./Roles";

export interface User {
  id: number;
  FirstName: string;
  LastName: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}