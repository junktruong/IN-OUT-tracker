import { NextResponse } from "next/server";
import { z } from "zod";

import { payBill } from "@/lib/repo/billsRepo";


const bodySchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAmount: z.number().positive().optional(),
  paidNote: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const parse = bodySchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
const IdPayload = (await params).id;
  const payload = parse.data;
  const updated = await payBill(
    IdPayload,
    new Date(`${payload.paidAt}T00:00:00`),
    payload.paidAmount,
    payload.paidNote
  );

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy khoản đóng." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id) });
}
