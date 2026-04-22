import { NextRequest, NextResponse } from "next/server";

import { unpayBill } from "@/lib/repo/billsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const updated = await unpayBill(user.id, id);

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id) });
}
