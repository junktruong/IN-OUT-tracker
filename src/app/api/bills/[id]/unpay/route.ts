import { NextResponse } from "next/server";

import { unpayBill } from "@/lib/repo/billsRepo";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const updated = await unpayBill(params.id);

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id) });
}
