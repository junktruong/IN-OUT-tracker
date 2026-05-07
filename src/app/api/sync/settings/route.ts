import { NextResponse } from "next/server";

import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";
import { settingsSyncBatchSchema } from "@/lib/domain/settings";
import { syncSettingsOperations } from "@/lib/repo/settingsSyncRepo";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = settingsSyncBatchSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu sync không hợp lệ." }, { status: 400 });
  }

  try {
    const results = await syncSettingsOperations(user.id, parse.data.operations);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Settings sync failed", error);
    return NextResponse.json({ error: "Không thể đồng bộ cài đặt." }, { status: 500 });
  }
}
