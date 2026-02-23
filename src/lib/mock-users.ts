import { UserRole } from "./auth"; // or from types file if you created one

export interface MockUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;   // ✅ NOT string
  buildingId?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "1",
    email: "admin@test.com",
    password: "123456",
    role: "ADMIN",
  },
  {
    id: "2",
    email: "staff@test.com",
    password: "123456",
    role: "STAFF",
  },
  {
    id: "3",
    email: "building@test.com",
    password: "123456",
    role: "BUILDING",
    buildingId: "b1",
  },
];