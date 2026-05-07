import { NextResponse } from "next/server";

import { settingsSchema } from "@/lib/domain/settings";
import { getSettings, updateSettings } from "@/lib/repo/settingsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const settings = await getSettings(user.id);
  return NextResponse.json({
    paydayDay: settings.paydayDay,
    salaryExpected: settings.salaryExpected,
    updatedAt: settings.updatedAt?.toISOString?.(),
    syncStatus: "synced" as const,
  });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = settingsSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const settings = await updateSettings(user.id, parse.data);
  return NextResponse.json({
    paydayDay: settings.paydayDay,
    salaryExpected: settings.salaryExpected,
    updatedAt: settings.updatedAt?.toISOString?.(),
    syncStatus: "synced" as const,
  });
}
