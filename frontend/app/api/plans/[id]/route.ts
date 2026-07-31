import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

async function authHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cb_token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = await authHeader();
  if (!headers) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { id } = await params;
  try {
    const res = await fetch(`${TRANSFER_AI_URL}/api/plans/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not reach service" }, { status: 502 });
  }
}
