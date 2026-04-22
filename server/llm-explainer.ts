import http from "http";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b-instruct-q4_0";
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || "12000", 10);
const OLLAMA_MAX_RETRIES = parseInt(process.env.OLLAMA_MAX_RETRIES || "2", 10);
const OLLAMA_RETRY_DELAY_MS = parseInt(process.env.OLLAMA_RETRY_DELAY_MS || "1200", 10);

export type NewsAlignment = "supportive" | "opposing" | "neutral";

export interface ExplainPayload {
  symbol: string;
  lstm_direction: "up" | "down";
  lstm_confidence: number;
  technical_score: number;
  price_action: string;
  volume_signal: string;
  sentiment_score: number;
  news_impact: string;
  top_feature_importance: Array<{ feature: string; importance: number }>;
  recent_news: Array<{ title: string; source: string; publishedAt: string }>;
}

export interface LLMExplanation {
  direction: "up" | "down";
  decisionConfidence: number;
  technicalReasoning: string[];
  newsAlignment: NewsAlignment;
  newsReasoning: string[];
  combinedView: string;
  riskFlags: string[];
  invalidations: string[];
  finalNote: string;
  usedFallback: boolean;
}

function httpRequest(url: string, body: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: OLLAMA_TIMEOUT_MS,
      },
      (res) => {
        let response = "";
        res.on("data", (chunk) => { response += chunk; });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 500, data: response ? JSON.parse(response) : {} });
          } catch {
            resolve({ status: res.statusCode || 500, data: response });
          }
        });
      },
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Ollama request timeout"));
    });

    req.write(body);
    req.end();
  });
}

function systemPrompt(): string {
  return [
    "You are a financial prediction explainer.",
    "You must explain the LSTM output, not replace it.",
    "Rules:",
    "1) Never change lstm_direction.",
    "2) Use only the provided payload.",
    "3) If evidence is weak or conflicting, state it explicitly.",
    "4) Return valid JSON only.",
    "5) Keep points concise and concrete.",
    'Output JSON keys exactly: direction, decision_confidence, technical_reasoning, news_alignment, news_reasoning, combined_view, risk_flags, invalidations, final_note.',
    "direction must be 'up' or 'down'.",
    "news_alignment must be one of: supportive, opposing, neutral.",
  ].join("\n");
}

function userPrompt(payload: ExplainPayload): string {
  return JSON.stringify(payload);
}

function parseJsonObject(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Invalid JSON from LLM");
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter((item) => item.trim().length > 0);
  }
  if (typeof value === "string") {
    const lines = value
      .split(/\r?\n|•|-/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return lines.length > 0 ? lines : [value.trim()].filter(Boolean);
  }
  return [];
}

function readArrayField(raw: any, keys: string[]): string[] {
  for (const key of keys) {
    const values = normalizeStringArray(raw?.[key]);
    if (values.length > 0) return values;
  }
  return [];
}

function readTextField(raw: any, keys: string[]): string {
  for (const key of keys) {
    const value = String(raw?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function validateExplanation(raw: any, payload: ExplainPayload): LLMExplanation {
  const directionValue = String(raw?.direction || raw?.lstm_direction || "").toLowerCase();
  const direction = directionValue === "up" || directionValue === "down" ? directionValue : null;
  if (!direction) throw new Error("Invalid direction in LLM output");
  if (direction !== payload.lstm_direction) throw new Error("direction_mismatch");

  const alignmentValue = String(raw?.news_alignment || raw?.newsAlignment || "").toLowerCase();
  const newsAlignment: NewsAlignment =
    alignmentValue === "supportive" || alignmentValue === "opposing" || alignmentValue === "neutral"
      ? (alignmentValue as NewsAlignment)
      : "neutral";

  const decisionConfidence = Number(raw?.decision_confidence ?? raw?.decisionConfidence ?? raw?.confidence);
  const boundedConfidence = Number.isFinite(decisionConfidence)
    ? Math.max(0, Math.min(1, decisionConfidence))
    : payload.lstm_confidence;

  const technicalReasoning = readArrayField(raw, [
    "technical_reasoning",
    "technicalReasoning",
    "reasoning",
    "reasons",
  ]).slice(0, 5);
  const newsReasoning = readArrayField(raw, [
    "news_reasoning",
    "newsReasoning",
    "news_reasons",
  ]).slice(0, 4);

  if (technicalReasoning.length === 0) {
    throw new Error("Missing technical_reasoning in LLM output");
  }

  return {
    direction,
    decisionConfidence: boundedConfidence,
    technicalReasoning,
    newsAlignment,
    newsReasoning,
    combinedView: readTextField(raw, ["combined_view", "combinedView", "summary"]) || "Model explanation is limited for this sample.",
    riskFlags: readArrayField(raw, ["risk_flags", "riskFlags"]).slice(0, 5),
    invalidations: readArrayField(raw, ["invalidations", "invalidation_points"]).slice(0, 5),
    finalNote: readTextField(raw, ["final_note", "finalNote"]) || "Educational content only, not financial advice.",
    usedFallback: false,
  };
}

export function buildFallbackExplanation(payload: ExplainPayload, reason: string): LLMExplanation {
  const sentimentLabel =
    payload.sentiment_score >= 0.55 ? "positive" : payload.sentiment_score <= 0.45 ? "negative" : "mixed";
  const alignment: NewsAlignment =
    (payload.lstm_direction === "up" && payload.sentiment_score >= 0.55) ||
    (payload.lstm_direction === "down" && payload.sentiment_score <= 0.45)
      ? "supportive"
      : (payload.lstm_direction === "up" && payload.sentiment_score <= 0.45) ||
          (payload.lstm_direction === "down" && payload.sentiment_score >= 0.55)
        ? "opposing"
        : "neutral";

  return {
    direction: payload.lstm_direction,
    decisionConfidence: payload.lstm_confidence,
    technicalReasoning: [
      `LSTM predicts ${payload.lstm_direction.toUpperCase()} with ${(payload.lstm_confidence * 100).toFixed(0)}% confidence.`,
      `Technical score is ${(payload.technical_score * 100).toFixed(0)}% with price action: ${payload.price_action}.`,
      `Volume signal indicates: ${payload.volume_signal}.`,
    ],
    newsAlignment: alignment,
    newsReasoning: [
      `News sentiment is ${sentimentLabel} (${(payload.sentiment_score * 100).toFixed(0)}%).`,
      `News impact summary: ${payload.news_impact}.`,
    ],
    combinedView: `Fallback explanation used (${reason}). Direction remains ${payload.lstm_direction.toUpperCase()} from LSTM.`,
    riskFlags: ["Model explanation fallback was used."],
    invalidations: ["If near-term trend/volume shifts sharply against the signal."],
    finalNote: "Educational content only, not financial advice.",
    usedFallback: true,
  };
}

export async function generateLLMExplanation(payload: ExplainPayload): Promise<LLMExplanation> {
  const requestBody = {
    model: OLLAMA_MODEL,
    stream: false,
    format: "json",
    keep_alive: "30m",
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userPrompt(payload) },
    ],
    options: {
      temperature: 0.15,
      top_p: 0.9,
      num_ctx: 2048,
      num_predict: 260,
    },
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= OLLAMA_MAX_RETRIES; attempt++) {
    try {
      const response = await httpRequest(`${OLLAMA_URL}/api/chat`, JSON.stringify(requestBody));
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Ollama returned status ${response.status}`);
      }

      const content = response.data?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Missing LLM content");
      }

      const raw = parseJsonObject(content);
      return validateExplanation(raw, payload);
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < OLLAMA_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, OLLAMA_RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError || new Error("Ollama explanation failed");
}
