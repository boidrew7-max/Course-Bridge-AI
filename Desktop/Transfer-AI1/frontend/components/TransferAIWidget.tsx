"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

// Lightweight floating "Ask Transfer AI" chat, usable on pages that don't
// have an existing plan/session context yet (homepage, onboarding). The
// dashboard has its own richer, plan-aware version inside PlannerClient —
// this one just talks to /api/chat directly with no extra context.
export default function TransferAIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    const history = [...messages, { role: "user" as const, content: message }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      if (!res.ok || !res.body) throw new Error("failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            reply += JSON.parse(data);
            setMessages([...history, { role: "assistant", content: reply }]);
          } catch {}
        }
      }
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setMessages([...history, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#0b7f46] px-5 py-4 text-base font-semibold text-white shadow-xl transition hover:bg-[#08683a] active:scale-95 sm:py-3 sm:text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Ask CourseBridge AI
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-[#e5e0d5] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#0a6e3d] to-[#0d9456] px-5 py-4">
            <div>
              <p className="text-base font-bold text-white">CourseBridge AI</p>
              <p className="text-xs text-white/80">Ask me anything about UC transfer</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Close chat">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-[#7b818b]">
                Ask about transfer requirements, GE, TAG, or how CourseBridge works.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-[#0b7f46] text-white"
                      : "border border-[#d8d0c3] bg-[#faf8f3] text-[#303236]"
                  }`}
                >
                  {m.content || <span className="animate-pulse">…</span>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-[#e5e0d5] px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-xl border border-[#d8d8dc] px-3 py-2 text-sm outline-none focus:border-[#0b7f46]"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#0b7f46] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
