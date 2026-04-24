import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { getBudgetAlerts } from "@/lib/repo/budgetsRepo";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const items = await getBudgetAlerts(user.id);
  return NextResponse.json({ items });
}
