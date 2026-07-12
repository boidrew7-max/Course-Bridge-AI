import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cb_token")?.value;
  if (!token) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  try {
    const res = await fetch(`${TRANSFER_AI_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const response = NextResponse.json(data, { status: res.status });
      if (res.status === 401) response.cookies.delete("cb_token");
      return response;
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach auth service" }, { status: 502 });
  }
}
