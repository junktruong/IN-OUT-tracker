import { NextResponse } from "next/server";
import { z } from "zod";

import { listBills, upsertBill } from "@/lib/repo/billsRepo";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  group: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  note: z.string().optional(),
});

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
  }));
  return NextResponse.json({ items: response });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parse = bodySchema.safeParse(body);

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
