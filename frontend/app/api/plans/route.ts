import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

async function authHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cb_token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function GET() {
  const headers = await authHeader();
  if (!headers) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const res = await fetch(`${TRANSFER_AI_URL}/api/plans`, { headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach service" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const headers = await authHeader();
  if (!headers) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    const res = await fetch(`${TRANSFER_AI_URL}/api/plans`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach service" }, { status: 502 });
  }
}
