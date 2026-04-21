import { requestPasswordReset } from "@/lib/controllers/passwordResetController";

export async function POST(req: Request) {
  return requestPasswordReset(req);
}
