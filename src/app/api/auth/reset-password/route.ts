import { resetPassword } from "@/lib/controllers/passwordResetController";

export async function POST(req: Request) {
  return resetPassword(req);
}
