import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getGoogleAuthUrl } from "@/lib/auth/google";
import {
  encodeReturnTo,
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  sanitizeReturnTo,
  setOAuthCookie,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const state = crypto.randomBytes(32).toString("base64url");
  const authUrl = getGoogleAuthUrl(request.url, state);
  const response = NextResponse.redirect(authUrl);

  setOAuthCookie(response, OAUTH_STATE_COOKIE, state);
  setOAuthCookie(response, OAUTH_RETURN_COOKIE, encodeReturnTo(returnTo));

  return response;
}
