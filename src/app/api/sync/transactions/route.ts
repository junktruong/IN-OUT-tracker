import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { transactionSyncBatchSchema } from "@/lib/domain/transactions";
import { syncTransactionOperations } from "@/lib/repo/transactionSyncRepo";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = transactionSyncBatchSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu sync không hợp lệ." }, { status: 400 });
  }

  try {
    const results = await syncTransactionOperations(user.id, parse.data.operations);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Transaction sync failed", error);
    return NextResponse.json({ error: "Không thể đồng bộ giao dịch." }, { status: 500 });
  }
}
