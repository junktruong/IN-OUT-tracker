import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { categorySyncBatchSchema } from "@/lib/domain/categories";
import { syncCategoryOperations } from "@/lib/repo/categorySyncRepo";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = categorySyncBatchSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu sync không hợp lệ." }, { status: 400 });
  }

  try {
    const results = await syncCategoryOperations(user.id, parse.data.operations);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Category sync failed", error);
    return NextResponse.json({ error: "Không thể đồng bộ danh mục." }, { status: 500 });
  }
}
