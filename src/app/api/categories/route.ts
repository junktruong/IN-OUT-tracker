import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { categorySchema } from "@/lib/domain/categories";
import { createCategory, listCategories } from "@/lib/repo/categoriesRepo";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const items = await listCategories(user.id);
  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      icon: item.icon,
      categoryType: item.categoryType,
      kind: item.kind,
    })),
  });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = categorySchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const result = await createCategory(user.id, parse.data);
  if (result.kind === "duplicate") {
    return NextResponse.json({ error: "Danh mục đã tồn tại." }, { status: 409 });
  }

  return NextResponse.json({
    id: String(result.category._id),
    name: result.category.name,
  });
}
