import "dotenv/config";
import { buildFallbackExplanation, generateLLMExplanation, type ExplainPayload } from "../server/llm-explainer";

async function main() {
  const payload: ExplainPayload = {
    symbol: process.env.TEST_SYMBOL || "AAPL",
    lstm_direction: "up",
    lstm_confidence: 0.61,
    technical_score: 0.57,
    price_action: "Strong upward trend",
    volume_signal: "Normal volume",
    sentiment_score: 0.52,
    news_impact: "Mixed/neutral news sentiment",
    top_feature_importance: [
      { feature: "Price Returns", importance: 0.33 },
      { feature: "Moving Average Ratio", importance: 0.24 },
      { feature: "News Sentiment", importance: 0.18 },
    ],
    recent_news: [
      {
        title: "Company reports mixed quarter with stable guidance",
        source: "Yahoo Finance",
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Analysts keep neutral view amid macro uncertainty",
        source: "Yahoo Finance",
        publishedAt: new Date().toISOString(),
      },
    ],
  };

  const started = Date.now();
  try {
    const result = await generateLLMExplanation(payload);
    const elapsed = Date.now() - started;
    console.log(JSON.stringify({
      ok: true,
      elapsed_ms: elapsed,
      usedFallback: result.usedFallback,
      direction: result.direction,
      newsAlignment: result.newsAlignment,
      technicalReasoningCount: result.technicalReasoning.length,
      combinedView: result.combinedView,
    }, null, 2));
  } catch (error: any) {
    const elapsed = Date.now() - started;
    const reason = error?.message || "unknown_error";
    const fallback = buildFallbackExplanation(payload, reason);
    console.log(JSON.stringify({
      ok: false,
      elapsed_ms: elapsed,
      error: reason,
      fallback_used: true,
      fallback_preview: {
        direction: fallback.direction,
        newsAlignment: fallback.newsAlignment,
        combinedView: fallback.combinedView,
      },
    }, null, 2));
    process.exitCode = 1;
  }
}

main();
