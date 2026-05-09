import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { payBill } from "@/lib/repo/billsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

const bodySchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAmount: z.number().positive().optional(),
  paidNote: z.string().optional(),
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
  const payload = parse.data;
  const updated = await payBill(
    user.id,
    id,
    {
      dueDate: new Date(`${payload.dueDate}T00:00:00`),
      paidAt: new Date(`${payload.paidAt}T00:00:00`),
      paidAmount: payload.paidAmount,
      paidNote: payload.paidNote,
    }
  );

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id), dueDate: payload.dueDate });
}
