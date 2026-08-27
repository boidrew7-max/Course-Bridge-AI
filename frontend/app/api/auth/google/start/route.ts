import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const SITE_URL = process.env.SITE_URL || "https://coursebridge.us";

export const STATE_COOKIE = "google_oauth_state";

// Full-page redirect straight to Google (not to the backend: the backend
// has no public URL, so it can't be an OAuth redirect target). Google
// eventually redirects back to /api/auth/google/callback on this domain.
export async function GET() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", SITE_URL));
  }
  // CSRF protection for the OAuth flow ("login CSRF"): without a state
  // parameter, an attacker can complete their OWN Google auth, then trick a
  // victim into visiting /api/auth/google/callback?code=<attacker's code>,
  // silently logging the victim into the attacker's account. Google's own
  // OAuth docs call this out as the reason state exists. Bind a random
  // value to a short-lived httpOnly cookie here, and require the callback
  // to see the same value come back from Google before trusting the code.
  const state = randomBytes(32).toString("hex");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes — plenty for the redirect round-trip, short-lived on purpose
    path: "/",
  });
  return res;
}
