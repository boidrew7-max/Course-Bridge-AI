import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

// Called by the /auth/callback page after a Google OAuth redirect delivers a
// token in the URL — moves it into an HttpOnly cookie so client JS never
// touches the raw token.
export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
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
