import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Newspaper, Activity, Zap, FileText } from "lucide-react";
import type { PredictionResult } from "@shared/schema";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  symbol: string;
}

const sectionIcons: Record<string, typeof Brain> = {
  summary: FileText,
  trend: TrendingUp,
  volume: BarChart3,
  news: Newspaper,
  drivers: Zap,
  model: Activity,
};

export function PredictionCard({ prediction, isLoading, symbol }: PredictionCardProps) {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t("aiPrediction")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-24 w-full mb-4 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t("aiPrediction")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("selectStockPredictions")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUp = prediction.direction === "up";
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t("nextDayPredictionFor")} {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div
            className={`rounded-md p-4 mb-4 ${
              isUp
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
            }`}
            data-testid="card-prediction-result"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2 rounded-md ${
                  isUp
                    ? "bg-emerald-100 dark:bg-emerald-900/50"
                    : "bg-red-100 dark:bg-red-900/50"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold" data-testid="text-prediction-direction">
                  {t("priceExpectedGo")} {isUp ? t("up") : t("down")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("targetDate")}: {prediction.targetDate}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("confidence")}</span>
                <span className="font-medium font-mono" data-testid="text-confidence-score">
                  {confidencePercent}%
                </span>
              </div>
              <Progress
                value={confidencePercent}
                className={`h-2 ${
                  isUp ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"
                }`}
                data-testid="progress-confidence"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-medium text-muted-foreground">{t("contributingFactors")}</h4>
            <FactorRow
              label={t("technicalScore")}
              value={`${(prediction.factors.technicalScore * 100).toFixed(0)}%`}
              testId="text-technical-score"
            />
            <FactorRow
              label={t("sentimentScore")}
              value={`${(prediction.factors.sentimentScore * 100).toFixed(0)}%`}
              testId="text-sentiment-score"
            />
            <FactorRow
              label={t("volumeSignal")}
              value={prediction.factors.volumeSignal}
              testId="text-volume-signal"
            />
            <FactorRow
              label={t("priceAction")}
              value={prediction.factors.priceAction}
              testId="text-price-action"
            />
            <FactorRow
              label={t("newsImpact")}
              value={prediction.factors.newsImpact}
              testId="text-news-impact"
            />
          </div>

          <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("predictionDisclaimer")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {prediction.analysisReport && prediction.analysisReport.length > 0 && (
        <Card data-testid="card-analysis-report">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("aiAnalysisReport")}
              <Badge variant="secondary" className="text-xs ml-auto">
                {isUp ? t("bullish") : t("bearish")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4" data-testid="analysis-report-sections">
              {prediction.analysisReport.map((section, index) => {
                const IconComponent = sectionIcons[section.icon] || FileText;
                return (
                  <div
                    key={index}
                    className="rounded-md border p-3"
                    data-testid={`analysis-section-${section.icon}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                      <h4 className="text-sm font-semibold">{section.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {prediction.explanation && (
        <Card data-testid="card-llm-explanation">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {t("llmExplanation")}
              <Badge variant="secondary" className="text-xs ml-auto capitalize">
                {prediction.explanation.newsAlignment}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="rounded-md border p-3">
              <h4 className="text-sm font-semibold mb-2">{t("combinedView")}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-llm-combined-view">
                {prediction.explanation.combinedView}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <h4 className="text-sm font-semibold mb-2">{t("technicalReasoning")}</h4>
              <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground" data-testid="list-llm-technical-reasoning">
                {prediction.explanation.technicalReasoning.map((item, idx) => (
                  <li key={`tech-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>

            {prediction.explanation.newsReasoning.length > 0 && (
              <div className="rounded-md border p-3">
                <h4 className="text-sm font-semibold mb-2">{t("newsReasoning")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground" data-testid="list-llm-news-reasoning">
                  {prediction.explanation.newsReasoning.map((item, idx) => (
                    <li key={`news-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.explanation.riskFlags.length > 0 && (
              <div className="rounded-md border p-3">
                <h4 className="text-sm font-semibold mb-2">{t("riskFlags")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground" data-testid="list-llm-risk-flags">
                  {prediction.explanation.riskFlags.map((item, idx) => (
                    <li key={`risk-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.explanation.invalidations.length > 0 && (
              <div className="rounded-md border p-3">
                <h4 className="text-sm font-semibold mb-2">{t("invalidations")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground" data-testid="list-llm-invalidations">
                  {prediction.explanation.invalidations.map((item, idx) => (
                    <li key={`inv-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground" data-testid="text-llm-final-note">
                {prediction.explanation.finalNote}
              </p>
              {prediction.explanation.usedFallback && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2" data-testid="text-llm-fallback-indicator">
                  Template explanation used (LLM unavailable or invalid response).
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FactorRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono text-xs" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
