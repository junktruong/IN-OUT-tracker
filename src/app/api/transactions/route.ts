import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getTransactionsByMonth,
  getTransactionsByYear,
  insertTransactions,
} from "@/lib/repo/transactionsRepo";
import { toYmd } from "@/lib/domain/date";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { transactionSchema } from "@/lib/domain/transactions";

const monthQuerySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });
const yearQuerySchema = z.object({ year: z.string().regex(/^\d{4}$/) });
const createTransactionSchema = transactionSchema.extend({
  clientId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const monthParse = monthQuerySchema.safeParse({ month: searchParams.get("month") });
  const yearParse = yearQuerySchema.safeParse({ year: searchParams.get("year") });

  let items: Awaited<ReturnType<typeof getTransactionsByMonth>>;

  if (monthParse.success) {
    items = await getTransactionsByMonth(user.id, monthParse.data.month);
  } else if (yearParse.success) {
    items = await getTransactionsByYear(user.id, Number(yearParse.data.year));
  } else {
    return NextResponse.json({ error: "Thiếu month hoặc year hợp lệ." }, { status: 400 });
  }

  const response = items.map((item) => ({
    id: item.clientId ?? String(item._id),
    clientId: item.clientId ?? String(item._id),
    serverId: String(item._id),
    date: toYmd(new Date(item.date)),
    type: item.type,
    amount: item.amount,
    categoryId: item.categoryId,
    category: item.category,
    desc: item.desc,
    source: item.source,
    method: item.method,
    account: item.account,
    note: item.note,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt ?? item.createdAt).toISOString(),
    syncStatus: "synced" as const,
  }));

  return NextResponse.json({ items: response });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = createTransactionSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const payload = parse.data;
  const [created] = await insertTransactions(user.id, [
    {
      ...payload,
      date: new Date(`${payload.date}T00:00:00`),
    },
  ]);

  return NextResponse.json({
    id: created.clientId ?? String(created._id),
    clientId: created.clientId ?? String(created._id),
    serverId: String(created._id),
  });
}
