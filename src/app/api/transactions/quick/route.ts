import { NextResponse } from "next/server";
import { z } from "zod";

import { quickParse } from "@/lib/domain/quickParse";
import { insertTransactions } from "@/lib/repo/transactionsRepo";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  raw: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parse = bodySchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { date, raw } = parse.data;
  const parsed = quickParse(raw);

  if (parsed.items.length > 0) {
    await insertTransactions(
      parsed.items.map((item) => ({
        ...item,
        date: new Date(`${date}T00:00:00`),
      }))
    );
  }

  return NextResponse.json({ added: parsed.items.length, skipped: parsed.skipped });
}
