import { NextResponse } from "next/server";
import { z } from "zod";

import { toggleBillPaid } from "@/lib/repo/billsRepo";

const bodySchema = z.object({
  paid: z.boolean(),
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

  const paidAt = parse.data.paid ? new Date() : null;
  const updated = await toggleBillPaid(params.id, parse.data.paid, paidAt);

  return NextResponse.json({ id: String(updated?._id) });
}
