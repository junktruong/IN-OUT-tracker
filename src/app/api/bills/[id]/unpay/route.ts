import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { unpayBill } from "@/lib/repo/billsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

const bodySchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const body = await request.json();
  const parse = bodySchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const updated = await unpayBill(user.id, id, new Date(`${parse.data.dueDate}T00:00:00`));

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id), dueDate: parse.data.dueDate });
}
