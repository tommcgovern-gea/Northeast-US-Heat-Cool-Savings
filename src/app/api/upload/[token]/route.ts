import { NextRequest } from "next/server";
import { getUploadContext, submitUpload } from "@/lib/controllers/uploadController";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  return getUploadContext(req, { params: resolvedParams });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  return submitUpload(req, { params: resolvedParams });
}
