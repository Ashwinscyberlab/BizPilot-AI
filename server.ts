import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets to enable AI features."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "bizpilot-ai-frontend-proxy" });
  });

  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { message, history = [], businessContext } = req.body as {
        message?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        businessContext?: Record<string, unknown>;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = [
        "You are BizPilot AI, an analytical small-business operations assistant.",
        "Answer clearly, concisely, and accurately using ONLY the provided live business snapshot data when answering operational questions (revenue, orders, low stock, top products, enquiries).",
        "Format currency values cleanly, use short bullet lists when listing products or orders, and never invent sales numbers that are not present in the context.",
        "If asked to draft a customer reply, write a warm, professional, ready-to-send email/message.",
        businessContext
          ? `\nLive Business Snapshot:\n${JSON.stringify(businessContext, null, 2)}`
          : "",
      ].join("\n");

      const transcript = history
        .slice(-8)
        .map((m) => `${m.role === "user" ? "Owner" : "BizPilot AI"}: ${m.content}`)
        .join("\n\n");

      const prompt = transcript
        ? `${transcript}\n\nOwner: ${message}`
        : `Owner: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: "AI returned an empty response." });
        return;
      }

      res.json({ reply });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate AI response.";
      const status =
        message.includes("GEMINI_API_KEY") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/ai/draft-reply", async (req: Request, res: Response) => {
    try {
      const {
        customerName,
        customerEmail,
        enquiryMessage,
        status,
        businessName,
        tone = "professional",
      } = req.body as {
        customerName?: string;
        customerEmail?: string;
        enquiryMessage?: string;
        status?: string;
        businessName?: string;
        tone?: string;
      };

      if (!enquiryMessage || !customerName) {
        res
          .status(400)
          .json({ error: "Customer name and enquiry message are required." });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Draft a ${tone} customer support reply for ${businessName || "our business"}.
Customer Name: ${customerName}
Customer Email: ${customerEmail || "N/A"}
Current Enquiry Status: ${status || "New"}
Customer Message: "${enquiryMessage}"

Write only the ready-to-send reply body (including greeting and sign-off). Keep it helpful, specific, and concise.`,
        config: {
          systemInstruction:
            "You are a senior customer operations manager writing clear, polite, practical replies to small business customer enquiries. Avoid clichés and keep replies concise.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const draft = response.text?.trim();
      if (!draft) {
        res.status(502).json({ error: "AI returned an empty draft." });
        return;
      }

      res.json({ draft });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to draft enquiry reply.";
      const status =
        message.includes("GEMINI_API_KEY") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BizPilot AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
