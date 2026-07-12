import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cb_token")?.value;
  if (token) {
    try {
      await fetch(`${TRANSFER_AI_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("cb_token");
  return response;
}
