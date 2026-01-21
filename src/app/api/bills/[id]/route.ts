import { NextRequest, NextResponse } from "next/server";

import { deleteBillById } from "@/lib/repo/billsRepo";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const removed = await deleteBillById(id);

  if (!removed) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(removed._id) });
}
