import { verifyAccessCode } from "@/lib/controllers/accessCodeController";

export async function POST(req: Request) {
  return verifyAccessCode(req);
}
