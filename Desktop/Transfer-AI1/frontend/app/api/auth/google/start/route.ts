import { NextResponse } from "next/server";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

// Full-page redirect (not a fetch) so the browser can carry this through the
// Google consent screen and back — the backend eventually redirects to
// /auth/callback?token=... on this frontend's own domain.
export async function GET() {
  return NextResponse.redirect(`${TRANSFER_AI_URL}/auth/google/start`);
}
