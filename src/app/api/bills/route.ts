import { NextResponse } from "next/server";
import { billSchema } from "@/lib/domain/bills";
import { toYmd } from "@/lib/domain/date";
import { listBillPayments, listBills, upsertBill } from "@/lib/repo/billsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

type LegacyBill = {
  dueDay?: number;
};

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const [items, payments] = await Promise.all([listBills(user.id), listBillPayments(user.id)]);
  const response = items.map((item) => {
    const legacy = item as LegacyBill;
    const cycleType = item.cycleType ?? "monthly";
    const cycleValue = item.cycleValue ?? legacy.dueDay ?? 1;

    return {
      id: item.clientId ?? String(item._id),
      clientId: item.clientId ?? String(item._id),
      serverId: String(item._id),
      name: item.name,
      amount: item.amount,
      cycleType,
      cycleValue,
      group: item.group,
      start: item.start ? toYmd(item.start) : undefined,
      end: item.end ? toYmd(item.end) : undefined,
      note: item.note,
      paid: item.paid,
      paidAt: item.paidAt ? toYmd(item.paidAt) : undefined,
      paidAmount: item.paidAmount ?? undefined,
      paidNote: item.paidNote ?? undefined,
      createdAt: item.createdAt ? item.createdAt.toISOString() : undefined,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : undefined,
    };
  });
  const occurrenceItems = payments.map((payment) => ({
    id: String(payment._id),
    templateId: payment.templateId,
    templateClientId: payment.templateClientId,
    name: payment.name,
    amount: payment.amount,
    cycleType: payment.cycleType,
    cycleValue: payment.cycleValue,
    group: payment.group,
    start: payment.start ? toYmd(payment.start) : undefined,
    end: payment.end ? toYmd(payment.end) : undefined,
    note: payment.note,
    dueDate: toYmd(payment.dueDate),
    status: payment.status === "paid" || payment.paidAt ? "paid" : "unpaid",
    paidAt: payment.paidAt ? toYmd(payment.paidAt) : undefined,
    paidAmount: payment.paidAmount ?? undefined,
    paidNote: payment.paidNote ?? undefined,
    createdAt: payment.createdAt ? payment.createdAt.toISOString() : undefined,
    updatedAt: payment.updatedAt ? payment.updatedAt.toISOString() : undefined,
  }));

  return NextResponse.json({
    items: response,
    occurrences: occurrenceItems,
    payments: occurrenceItems.filter((item) => item.status === "paid"),
  });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = billSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const payload = parse.data;
  const result = await upsertBill(user.id, {
    id: payload.id,
    clientId: payload.id,
    name: payload.name,
    amount: payload.amount,
    cycleType: payload.cycleType,
    cycleValue: payload.cycleValue,
    group: payload.group,
    start: payload.start ? new Date(`${payload.start}T00:00:00`) : null,
    end: payload.end ? new Date(`${payload.end}T00:00:00`) : null,
    note: payload.note,
  });

  return NextResponse.json({
    id: result?.clientId ?? String(result?._id),
    clientId: result?.clientId ?? String(result?._id),
    serverId: result?._id ? String(result._id) : undefined,
  });
}
