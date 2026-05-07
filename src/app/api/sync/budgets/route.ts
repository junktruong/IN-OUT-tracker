import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { budgetSyncBatchSchema } from "@/lib/domain/budgets";
import { syncBudgetOperations } from "@/lib/repo/budgetSyncRepo";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = budgetSyncBatchSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu sync không hợp lệ." }, { status: 400 });
  }

  try {
    const results = await syncBudgetOperations(user.id, parse.data.operations);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Budget sync failed", error);
    return NextResponse.json({ error: "Không thể đồng bộ ngân sách." }, { status: 500 });
  }
}
