import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Loader2,
  Send,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useDataStore } from "@/src/hooks/useDataStore";
import { formatDateTime } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";

const SUGGESTED_QUESTIONS = [
  "What were my sales this month?",
  "Which products are running out?",
  "How many orders are pending?",
  "Which products sell the most?",
  "Draft a reply to a customer enquiry.",
];

export function AssistantPage() {
  const { aiHistory, sendAiMessage, clearAiHistory, settings } = useDataStore();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiHistory, isSending]);

  async function handleSend(promptText?: string) {
    const query = (promptText ?? input).trim();
    if (!query || isSending) return;

    if (!promptText) setInput("");
    setErrorBanner(null);
    setIsSending(true);

    try {
      await sendAiMessage(query);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Unable to reach AI assistant."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            AI Business Assistant
          </h2>
          <p className="text-sm text-slate-500">
            Ask operational questions grounded in {settings.businessName}&apos;s live sales, orders, inventory, and enquiries.
          </p>
        </div>
        {aiHistory.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAiHistory}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat History
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Chat Container */}
        <Card className="lg:col-span-8 flex flex-col h-[calc(100vh-14rem)] min-h-[520px]">
          <CardHeader className="flex flex-row items-center justify-between py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-900 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">BizPilot Operations Analyst</CardTitle>
                <p className="text-xs text-slate-500">
                  Connected to live orders, stock, and customer records
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
            {aiHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-900">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Ask anything about your business
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select one of the suggested operational prompts or ask your own question about monthly revenue, low-stock SKUs, pending orders, or customer replies.
                </p>
              </div>
            ) : (
              aiHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-900 text-white mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white"
                        : msg.error
                        ? "border border-red-200 bg-red-50 text-red-800"
                        : "border border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`mt-1.5 text-[11px] ${
                        msg.role === "user" ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {formatDateTime(msg.createdAt)}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 mt-0.5">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isSending && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-900 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700" />
                  Analyzing business metrics...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </CardContent>

          {errorBanner && (
            <div
              role="alert"
              className="mx-5 mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="truncate">{errorBanner}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-slate-200 p-4 flex items-center gap-2.5 bg-white rounded-b-lg"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about sales, low stock, pending orders, or drafting a reply..."
              disabled={isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!input.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </form>
        </Card>

        {/* Suggested Questions Sidebar */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm">Suggested Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isSending}
                onClick={() => handleSend(q)}
                className="w-full text-left rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
