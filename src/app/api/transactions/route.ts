import { NextResponse } from "next/server";
import { z } from "zod";

import { getTransactionsByMonth } from "@/lib/repo/transactionsRepo";
import { toYmd } from "@/lib/domain/date";

const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parse = querySchema.safeParse({ month: searchParams.get("month") });

  if (!parse.success) {
    return NextResponse.json({ error: "Thiếu month hợp lệ." }, { status: 400 });
  }

  const items = await getTransactionsByMonth(parse.data.month);
  const response = items.map((item) => ({
    id: String(item._id),
    date: toYmd(new Date(item.date)),
    type: item.type,
    amount: item.amount,
    category: item.category,
    desc: item.desc,
    source: item.source,
    method: item.method,
    account: item.account,
    note: item.note,
    createdAt: new Date(item.createdAt).toISOString(),
  }));

  return NextResponse.json({ items: response });
}
