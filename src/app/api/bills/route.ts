import { NextResponse } from "next/server";
import { billSchema } from "@/lib/domain/bills";
import { listBills, upsertBill } from "@/lib/repo/billsRepo";

export async function GET() {
  const items = await listBills();
  const response = items.map((item) => ({
    id: String(item._id),
    name: item.name,
    amount: item.amount,
    dueDay: item.dueDay,
    group: item.group,
    start: item.start ? item.start.toISOString().slice(0, 10) : undefined,
    end: item.end ? item.end.toISOString().slice(0, 10) : undefined,
    note: item.note,
    paid: item.paid,
    paidAt: item.paidAt ? item.paidAt.toISOString().slice(0, 10) : undefined,
    paidAmount: item.paidAmount ?? undefined,
    paidNote: item.paidNote ?? undefined,
  }));
  return NextResponse.json({ items: response });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parse = billSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const payload = parse.data;
  const result = await upsertBill({
    id: payload.id,
    name: payload.name,
    amount: payload.amount,
    dueDay: payload.dueDay,
    group: payload.group,
    start: payload.start ? new Date(`${payload.start}T00:00:00`) : null,
    end: payload.end ? new Date(`${payload.end}T00:00:00`) : null,
    note: payload.note,
  });

  return NextResponse.json({ id: String(result?._id) });
}
