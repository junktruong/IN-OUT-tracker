import { NextResponse } from "next/server";
import { z } from "zod";

import { getSettings, updateSettings } from "@/lib/repo/settingsRepo";
import { getSessionUserFromRequest, unauthorizedResponse } from "@/lib/auth/session";

const bodySchema = z.object({
  paydayDay: z.number().int().min(1).max(31),
  salaryExpected: z.number().min(0),
});

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const settings = await getSettings(user.id);
  return NextResponse.json({
    paydayDay: settings.paydayDay,
    salaryExpected: settings.salaryExpected,
  });
}

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parse = bodySchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const settings = await updateSettings(user.id, parse.data);
  return NextResponse.json({
    paydayDay: settings.paydayDay,
    salaryExpected: settings.salaryExpected,
  });
}
