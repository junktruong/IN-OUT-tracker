import { NextRequest, NextResponse } from "next/server";

import { transactionSchema } from "@/lib/domain/transactions";
import { deleteTransactionById, updateTransactionById } from "@/lib/repo/transactionsRepo";
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
  const body = await request.json();
  const parse = transactionSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const payload = parse.data;
  const updated = await updateTransactionById(user.id, id, {
    ...payload,
    date: new Date(`${payload.date}T00:00:00`),
  });

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch." }, { status: 404 });
  }

  return NextResponse.json({ id: String(updated._id) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const removed = await deleteTransactionById(user.id, id);

  if (!removed) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch." }, { status: 404 });
  }

  return NextResponse.json({ id: String(removed._id) });
}
