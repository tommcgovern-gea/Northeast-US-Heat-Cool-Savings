import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { checkAlerts, sendPendingMessages, dailySummary } from "@/lib/controllers/cronController";
import { complianceService } from "@/lib/services/complianceService";

function withCronSecret(req: NextRequest): NextRequest {
  const secret = process.env.CRON_SECRET;
  const headers = new Headers(req.headers);
  if (secret) headers.set("x-cron-secret", secret);
  return new NextRequest(req.url, { method: "POST", headers });
}

async function requireAdmin(req: NextRequest): Promise<TokenPayload | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const user = verifyToken(auth.slice(7)) as TokenPayload;
  return user?.role === "ADMIN" ? user : null;
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || req.nextUrl.searchParams.get("action");

  const cronReq = withCronSecret(req);

  try {
    switch (action) {
      case "check-alerts":
        return await checkAlerts(cronReq);
      case "send-pending":
        return await sendPendingMessages(cronReq);
      case "daily-summary": {
        const res = await dailySummary(cronReq);
        return res;
      }
      case "check-compliance": {
        const warnings = await complianceService.checkAndSendWarnings();
        return NextResponse.json({ warningsSent: warnings });
      }
      default:
        return NextResponse.json(
          { message: "Invalid action. Use: check-alerts | send-pending | daily-summary | check-compliance" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Trigger error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
