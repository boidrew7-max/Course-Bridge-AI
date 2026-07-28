import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const SITE_URL = process.env.SITE_URL || "https://coursebridge.us";

// Full-page redirect straight to Google (not to the backend — the backend
// has no public URL, so it can't be an OAuth redirect target). Google
// eventually redirects back to /api/auth/google/callback on this domain.
export async function GET() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", SITE_URL));
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
