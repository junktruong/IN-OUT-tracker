import { NextResponse } from "next/server";

import { deleteBillById } from "@/lib/repo/billsRepo";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const removed = await deleteBillById(params.id);

  if (!removed) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(removed._id) });
}
