
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION = 8 * 60 * 60; // 8 ชั่วโมง

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createAdminSession() {
  const payload = {
    username: process.env.ADMIN_USER,
    expiresAt: Date.now() + SESSION_DURATION * 1000,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyAdminSession(token?: string) {
  if (!token) return false;

  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return false;

    const expected = sign(data);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );

    return (
      payload.username === process.env.ADMIN_USER &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export { COOKIE_NAME, SESSION_DURATION };
