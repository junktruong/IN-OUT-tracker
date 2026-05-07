import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { billSyncBatchSchema } from "@/lib/domain/bills";
import { syncBillOperations } from "@/lib/repo/billSyncRepo";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = billSyncBatchSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu sync không hợp lệ." }, { status: 400 });
  }

  try {
    const results = await syncBillOperations(user.id, parse.data.operations);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Bill sync failed", error);
    return NextResponse.json({ error: "Không thể đồng bộ khoản đóng." }, { status: 500 });
  }
}
