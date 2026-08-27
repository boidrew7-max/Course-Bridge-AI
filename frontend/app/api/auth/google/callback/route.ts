import { NextResponse } from "next/server";
import { STATE_COOKIE } from "../start/route";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";
// req.url can report Railway's internal host:port behind the proxy instead
// of the public domain, so redirects use this explicit base instead.
const SITE_URL = process.env.SITE_URL || "https://coursebridge.us";

// Google redirects the user's browser here after they approve sign-in. This
// route runs on the frontend server, exchanges the code with Google directly,
// then hands the resulting identity to the backend over Railway's private
// network to create/find the account and mint a session token: the backend
// never needs a public URL for any of this.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  // Reject if the code is missing, or if state doesn't match what we set
  // before redirecting to Google — the CSRF check start/route.ts exists for.
  // A missing cookie (expired, blocked, or never set) fails closed rather
  // than being treated as "no check configured."
  if (!code || !state || !cookieState || state !== cookieState) {
    const res = NextResponse.redirect(new URL("/login?error=google_auth_failed", SITE_URL));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error("userinfo failed");
    const info = await infoRes.json();
    const google_id = info.sub;
    const email = (info.email || "").toLowerCase().trim();
    const name = info.name || "";
    if (!google_id || !email) throw new Error("missing sub/email");

    const completeRes = await fetch(`${TRANSFER_AI_URL}/auth/google/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": INTERNAL_API_SECRET },
      body: JSON.stringify({ google_id, email, name }),
    });
    if (!completeRes.ok) throw new Error("account creation failed");
    const { token } = await completeRes.json();

    const res = NextResponse.redirect(new URL(`/auth/callback?token=${encodeURIComponent(token)}`, SITE_URL));
    res.cookies.delete(STATE_COOKIE); // single-use — clear on success too
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/login?error=google_auth_failed", SITE_URL));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
