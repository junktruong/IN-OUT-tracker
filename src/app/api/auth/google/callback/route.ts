import { NextRequest, NextResponse } from "next/server";

import { getGoogleUserFromCode } from "@/lib/auth/google";
import {
  clearOAuthCookies,
  decodeReturnTo,
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  sanitizeReturnTo,
  setSessionCookie,
} from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/repo/usersRepo";

export const runtime = "nodejs";

const redirectWithError = (requestUrl: string) => {
  const response = NextResponse.redirect(new URL("/?auth=error", requestUrl));
  clearOAuthCookies(response);
  return response;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const returnTo = sanitizeReturnTo(
    decodeReturnTo(request.cookies.get(OAUTH_RETURN_COOKIE)?.value)
  );

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request.url);
  }

  try {
    const user = await getGoogleUserFromCode(request.url, code);
    await upsertGoogleUser(user);

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    setSessionCookie(response, user);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error("Google login failed", error);
    return redirectWithError(request.url);
  }
}
