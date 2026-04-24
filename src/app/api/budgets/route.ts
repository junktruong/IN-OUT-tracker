import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { budgetPeriods, budgetSchema } from "@/lib/domain/budgets";
import { getCategoryById } from "@/lib/repo/categoriesRepo";
import { listBudgetsWithProgress, upsertBudget } from "@/lib/repo/budgetsRepo";

const querySchema = z.object({
  period: z.enum(budgetPeriods).optional(),
});

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const parse = querySchema.safeParse({ period: searchParams.get("period") ?? undefined });

  if (!parse.success) {
    return NextResponse.json({ error: "Query không hợp lệ." }, { status: 400 });
  }

  const items = await listBudgetsWithProgress(user.id, parse.data.period);
  return NextResponse.json({
    items,
  });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = budgetSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const category = await getCategoryById(user.id, parse.data.categoryId);
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
  }

  const result = await upsertBudget(user.id, parse.data);
  return NextResponse.json({ id: String(result?._id) });
}
