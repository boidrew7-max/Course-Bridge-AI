import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";

// This proxies a per-user, frequently-changing resource (saved plans).
// Next.js's fetch() caches server-side requests by default unless told
// otherwise, which let this route keep serving an old plan_text after a
// plan was regenerated server-side — a real bug: refreshing the page never
// helped because the STALE RESPONSE was cached here, upstream of the
// browser entirely. Both must be disabled: `cache: "no-store"` on the fetch
// itself, and `dynamic = "force-dynamic"` so the route handler is never
// statically optimized either.
export const dynamic = "force-dynamic";

async function authHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cb_token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function GET() {
  const headers = await authHeader();
  if (!headers) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const res = await fetch(`${TRANSFER_AI_URL}/api/plans`, { headers, cache: "no-store" });
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
