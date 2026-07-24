import { NextResponse } from "next/server";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${TRANSFER_AI_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach auth service" }, { status: 502 });
  }
}
