"use client";

import { useRef, useState } from "react";
import { useTranslation } from "../lib/i18n";
import { readLocalChatContext } from "../lib/chatContext";

type Message = { role: "user" | "assistant"; content: string };

// Lightweight floating "Ask Transfer AI" chat, usable on pages that don't
// have an existing plan/session context yet (homepage, onboarding). The
// dashboard has its own richer, plan-aware version inside PlannerClient.
// This one sends whatever onboarding saved locally, so the advisor knows the
// student's college, target campuses and completed courses even before they
// have an account.
export default function TransferAIWidget() {
  const { t } = useTranslation();
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
        body: JSON.stringify({ history, plannerContext: readLocalChatContext() }),
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
      setMessages([...history, { role: "assistant", content: t("common.genericError") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="cb-btn cb-btn-primary fixed z-40"
          style={{
            right: "var(--cb-gutter)",
            bottom: `calc(var(--cb-gutter) + env(safe-area-inset-bottom))`,
            borderRadius: "var(--cb-radius-pill)",
            boxShadow: "var(--cb-shadow)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {t("widget.askButton")}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("widget.title")}
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            right: "var(--cb-gutter)",
            bottom: `calc(var(--cb-gutter) + env(safe-area-inset-bottom))`,
            width: `min(22rem, calc(100vw - 2 * var(--cb-gutter)))`,
            height: "min(32rem, calc(100dvh - 6rem))",
            background: "var(--cb-card)",
            border: "1px solid var(--cb-border)",
            borderRadius: "var(--cb-radius-card)",
            boxShadow: "var(--cb-shadow)",
          }}
        >
          <div
            className="flex items-center justify-between gap-[var(--cb-space-2)]"
            style={{ background: "var(--cb-accent)", padding: "var(--cb-space-2) var(--cb-space-3)" }}
          >
            <div>
              <p style={{ margin: 0, fontFamily: "var(--cb-font-heading)", fontWeight: 700, color: "var(--cb-on-accent)" }}>{t("widget.title")}</p>
              <p style={{ margin: 0, fontSize: "var(--cb-fs-body-sm)", color: "color-mix(in srgb, var(--cb-on-accent) 88%, var(--cb-accent))" }}>{t("widget.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("widget.closeAria")}
              className="flex shrink-0 items-center justify-center"
              style={{ width: 44, height: 44, background: "none", border: "none", color: "var(--cb-on-accent)", cursor: "pointer" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto" style={{ padding: "var(--cb-space-2)" }}>
            {messages.length === 0 && (
              <p style={{ margin: 0, fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-muted)" }}>
                {t("widget.emptyState")}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%]"
                  style={{
                    borderRadius: "var(--cb-radius-card)",
                    padding: "0.625rem 1rem",
                    fontSize: "var(--cb-fs-body-sm)",
                    ...(m.role === "user"
                      ? { background: "var(--cb-accent)", color: "var(--cb-on-accent)" }
                      : {
                          background: "var(--cb-surface-alt)",
                          border: "1px solid var(--cb-border)",
                          color: "var(--cb-body)",
                        }),
                  }}
                >
                  {m.content || <span className="animate-pulse">…</span>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-[var(--cb-space-1)]"
            style={{ borderTop: "1px solid var(--cb-border)", padding: "var(--cb-space-1)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("widget.placeholder")}
              aria-label={t("widget.placeholder")}
              className="flex-1"
              style={{
                minHeight: 44,
                borderRadius: "var(--cb-radius-btn)",
                border: "1px solid var(--cb-border)",
                background: "var(--cb-surface)",
                color: "var(--cb-body)",
                padding: "0 0.75rem",
                fontSize: "var(--cb-fs-body-sm)",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="cb-btn cb-btn-primary"
              style={{ paddingInline: "1rem", opacity: loading ? 0.6 : 1 }}
            >
              {t("widget.send")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
