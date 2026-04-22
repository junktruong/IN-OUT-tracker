import { NextRequest, NextResponse } from "next/server";

import { deleteBillById } from "@/lib/repo/billsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const removed = await deleteBillById(user.id, id);

  if (!removed) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(removed._id) });
}
