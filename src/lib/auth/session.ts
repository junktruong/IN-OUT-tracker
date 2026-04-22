import crypto from "node:crypto";
import type { NextResponse } from "next/server";

import type { AuthUser } from "@/lib/auth/types";

export const SESSION_COOKIE = "inout_session";
export const OAUTH_STATE_COOKIE = "inout_oauth_state";
export const OAUTH_RETURN_COOKIE = "inout_oauth_return";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE_SECONDS = 60 * 10;

type SessionPayload = AuthUser & {
  exp: number;
};

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const getSessionSecret = () => {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET or GOOGLE_CLIENT_SECRET is not set");
  }

  return secret;
};

const encodeJson = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const decodeJson = <T>(value: string): T =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;

const sign = (value: string) =>
  crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");

const signaturesMatch = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const parseCookieHeader = (cookieHeader: string | null) => {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(";").forEach((cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName) {
      return;
    }
    try {
      cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
    } catch {
      cookies.set(rawName, rawValue.join("="));
    }
  });

  return cookies;
};

export const createSessionToken = (user: AuthUser) => {
  const payload = encodeJson({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  } satisfies SessionPayload);

  return `${payload}.${sign(payload)}`;
};

export const parseSessionToken = (token?: string): AuthUser | null => {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !signaturesMatch(signature, sign(payload))) {
    return null;
  }

  try {
    const session = decodeJson<SessionPayload>(payload);
    if (!session.id || !session.email || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: session.id,
      email: session.email,
      name: session.name,
      picture: session.picture,
    };
  } catch {
    return null;
  }
};

export const getSessionUserFromRequest = (request: Request) => {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return parseSessionToken(cookies.get(SESSION_COOKIE));
};

export const setSessionCookie = (response: NextResponse, user: AuthUser) => {
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    ...baseCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE, "", {
    ...baseCookieOptions,
    maxAge: 0,
  });
};

export const setOAuthCookie = (response: NextResponse, name: string, value: string) => {
  response.cookies.set(name, value, {
    ...baseCookieOptions,
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });
};

export const clearOAuthCookies = (response: NextResponse) => {
  [OAUTH_STATE_COOKIE, OAUTH_RETURN_COOKIE].forEach((name) => {
    response.cookies.set(name, "", {
      ...baseCookieOptions,
      maxAge: 0,
    });
  });
};

export const unauthorizedResponse = () =>
  Response.json({ error: "Vui lòng đăng nhập bằng Google." }, { status: 401 });

export const encodeReturnTo = (returnTo: string) =>
  Buffer.from(returnTo).toString("base64url");

export const decodeReturnTo = (returnTo?: string) => {
  if (!returnTo) {
    return "/";
  }

  try {
    return Buffer.from(returnTo, "base64url").toString("utf8");
  } catch {
    return "/";
  }
};

export const sanitizeReturnTo = (returnTo: string | null) => {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
};
