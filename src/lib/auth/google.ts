import { OAuth2Client } from "google-auth-library";

import type { AuthUser } from "@/lib/auth/types";

const getGoogleEnv = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return { clientId, clientSecret };
};

const getRedirectUri = (requestUrl: string) =>
  new URL("/api/auth/google/callback", requestUrl).toString();

export const getGoogleAuthUrl = (requestUrl: string, state: string) => {
  const { clientId, clientSecret } = getGoogleEnv();
  const client = new OAuth2Client(clientId, clientSecret, getRedirectUri(requestUrl));

  return client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
};

export const getGoogleUserFromCode = async (
  requestUrl: string,
  code: string
): Promise<AuthUser> => {
  const { clientId, clientSecret } = getGoogleEnv();
  const client = new OAuth2Client(clientId, clientSecret, getRedirectUri(requestUrl));
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an id token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || payload.email_verified === false) {
    throw new Error("Google account payload is missing required identity fields");
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
};
