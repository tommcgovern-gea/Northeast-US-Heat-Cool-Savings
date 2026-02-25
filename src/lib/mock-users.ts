import { UserRole } from "./auth";
import { mockBuildings } from "./mock-buildings";

export interface MockUser {
  id: string;
  email: string;
  password: string;         // stored hashed (plain for mock)
  role: UserRole;
  buildingId?: string;
  buildingName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "1",
    email: "admin@test.com",
    password: "123456",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    email: "staff@test.com",
    password: "123456",
    role: "STAFF",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    email: "building@test.com",
    password: "123456",
    role: "BUILDING",
    buildingId: "1",
    buildingName: mockBuildings.find((b) => b.id === "1")?.name || "Downtown HQ",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];