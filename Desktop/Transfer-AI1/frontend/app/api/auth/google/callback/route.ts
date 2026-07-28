import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";

// Google redirects the user's browser here after they approve sign-in. This
// route runs on the frontend server, exchanges the code with Google directly,
// then hands the resulting identity to the backend over Railway's private
// network to create/find the account and mint a session token — the backend
// never needs a public URL for any of this.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", req.url));
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

    return NextResponse.redirect(new URL(`/auth/callback?token=${encodeURIComponent(token)}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", req.url));
  }
}
