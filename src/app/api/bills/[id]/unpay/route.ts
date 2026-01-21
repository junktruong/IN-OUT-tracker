import { NextRequest, NextResponse } from "next/server";

import { unpayBill } from "@/lib/repo/billsRepo";

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const updated = await unpayBill(id);

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id) });
}
