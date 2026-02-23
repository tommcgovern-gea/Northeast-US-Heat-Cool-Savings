import { login } from "@/lib/controllers/authController";

export async function POST(req: Request) {
  return login(req);
}