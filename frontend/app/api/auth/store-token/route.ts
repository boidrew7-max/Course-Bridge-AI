import { NextResponse } from "next/server";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";
const isProd = process.env.NODE_ENV === "production";

// Called by the /auth/callback page after a Google OAuth redirect delivers a
// token in the URL: moves it into an HttpOnly cookie so client JS never
// touches the raw token.
export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  // This route is unauthenticated by necessity (it's the first thing that runs
  // after the OAuth redirect), so it must not mint a session cookie for an
  // arbitrary string handed to it. Shape-check, then make the backend confirm
  // the token actually resolves to a user before it becomes a session.
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }
  try {
    const check = await fetch(`${TRANSFER_AI_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!check.ok) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach auth service" }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("cb_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
