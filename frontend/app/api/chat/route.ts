import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const TRANSFER_AI_URL = process.env.TRANSFER_AI_URL || "https://course-bridge-ai-production.up.railway.app";
  console.log("[chat] TRANSFER_AI_URL =", TRANSFER_AI_URL);

  try {
    const body = await req.json();

    // Forward the session token so the advisor can look up who is asking.
    // Without this the backend sees every conversation as anonymous and the
    // student has to re-state their college and major in every message.
    const token = (await cookies()).get("cb_token")?.value;

    const upstream = await fetch(`${TRANSFER_AI_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Transfer AI service unavailable" },
        { status: 502 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Chat proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach Transfer AI service" },
      { status: 502 }
    );
  }
}
